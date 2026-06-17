import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import session from "express-session";
import { RedisStore } from "connect-redis";
import pinoHttp from "pino-http";
import helmet from "helmet";
import mongoose from "mongoose";

// Config & utils
import { connectDB } from "./db/connectdb.js";
import { connectRedis } from "./config/redisClient.js";
import logger from "./src/common/utils/logger.js";
import messageCleanupJob from "./schedulers/messageCleanupJob.js";
import { startCronJobs } from "./schedulers/sessionCreationJob.js";
import { startCronJobsForScheduledDeletion } from "./schedulers/scheduledDeletionJob.js";
import { startEncryptionKeyRotation } from "./schedulers/encryptionKeyRotationJob.js";
import { startReminderJobs } from "./schedulers/reminderNotificationJob.js";
import { initializeEncryptionKeys, decryptBuffer, isEncryptedFile } from "./services/backendEncryptionService.js";
import { initializeSocketServer } from "./src/socket.js";
import routeIndex from "./src/routes.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import { autoInitializeDatabase } from "./scripts/seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let io;

/**
 * Resolves once Mongoose is fully connected.
 * No-op if already connected.
 */
const waitForDb = () =>
  new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) return resolve();
    mongoose.connection.once("connected", resolve);
  });

(async () => {
  try {
    const port = process.env.PORT || 3001;
    const DATABASE_URL = process.env.DATABASE_URL;

    // Connect DB & Redis — await both before anything else
    await connectDB(DATABASE_URL);
    const redis = await connectRedis();

    // Auto-initialize database with seed data if empty
    await autoInitializeDatabase();

    // Initialize backend encryption keys
    await initializeEncryptionKeys();
    logger.info("🔐 Backend encryption service initialized");

    // Core middlewares
    app.set("trust proxy", 1);
    app.use(helmet());
    app.use(compression());

    const originUrl = process.env.ORIGIN_URL || "http://localhost:3000";
    const allowedOrigins = originUrl.split(",").map((s) => s.trim());
    app.use(cors({ origin: allowedOrigins, credentials: true }));

    app.use("/images", express.static(path.join(process.cwd(), "public/images")));

    // Serve uploaded files — decrypt BENC-encrypted files on-the-fly
    app.use("/uploads", async (req, res, next) => {
      try {
        // CRITICAL: decode URL-encoded path so "images%20(7).jpg" matches disk filename
        const decoded = decodeURIComponent(req.path);
        const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
        const filePath = path.join(process.cwd(), "uploads", safePath);

        // Path traversal guard
        if (!filePath.startsWith(path.join(process.cwd(), "uploads"))) {
          return res.status(400).send("Invalid path");
        }

        // Use named exports from dynamic import
        const { existsSync, statSync, readFileSync } = await import("fs");
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          return next();
        }

        const fileBuffer = readFileSync(filePath);

        if (isEncryptedFile(fileBuffer)) {
          const decrypted = await decryptBuffer(fileBuffer);
          const ext = path.extname(filePath).toLowerCase().replace(".", "");
          const mimeMap = {
            jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
            gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
            mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg",
            ogg: "audio/ogg", wav: "audio/wav",
            pdf: "application/pdf", doc: "application/msword",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          };
          res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
          res.setHeader("Cache-Control", "private, max-age=86400");
          res.setHeader("X-Content-Type-Options", "nosniff");
          return res.send(decrypted);
        }

        // Not BENC encrypted — serve raw file
        return express.static(path.join(process.cwd(), "uploads"))(req, res, next);
      } catch (err) {
        console.error("Upload serve error:", err.message);
        return next();
      }
    });

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Sessions (Redis)
    const isProduction = process.env.NODE_ENV === "production";
    app.use(
      session({
        store: new RedisStore({ client: redis, prefix: "alfajr:sess:" }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: isProduction,
          httpOnly: true,
          sameSite: isProduction ? "none" : "lax",
          maxAge: 24 * 60 * 60 * 1000,
        },
        name: "sid",
      })
    );

    // Socket.IO
    const server = http.createServer(app);
    io = await initializeSocketServer(server, redis);

    try {
      global.io = io;
    } catch (e) {
      // ignore
    }

    const attachIo = (req, _res, next) => {
      req.io = io;
      next();
    };

    // Routes
    app.use("/", apiLimiter, attachIo, routeIndex);

    // 404
    app.use((req, res) =>
      res.status(404).json({ success: false, message: "Route not found" })
    );

    // Error handler
    app.use((err, req, res, next) => {
      logger.error({ err, url: req.originalUrl }, "Unhandled error");
      res
        .status(err.status || 500)
        .json({ success: false, message: err.message || "Server Error" });
    });

    // Start server first, then schedulers
    server.listen(port, "0.0.0.0", async () => {
      logger.info(`Server running on port ${port}`);

      // Wait for DB to be fully ready before starting any cron jobs
      await waitForDb();

      messageCleanupJob.start();
      startCronJobs();
      startCronJobsForScheduledDeletion();
      startEncryptionKeyRotation();
      startReminderJobs();

      logger.info("🕐 All cron jobs started");
    });

    // Graceful shutdown
    const shutdown = (signal) => async () => {
      logger.info(`${signal} received, shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
      setTimeout(() => {
        logger.error("Force exiting after 10s");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", shutdown("SIGINT"));
    process.on("SIGTERM", shutdown("SIGTERM"));
  } catch (err) {
    logger.error({ err }, "Error starting server:");
    console.error("Full error:", err);
    process.exit(1);
  }
})();

export { app, io };