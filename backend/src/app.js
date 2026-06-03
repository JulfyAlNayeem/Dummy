import "dotenv/config";
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

// Config & utils
import { connectDB } from "../db/connectdb.js";
import { connectRedis } from "../config/redisClient.js";
import logger from "./common/utils/logger.js";
import messageCleanupJob from "../schedulers/messageCleanupJob.js";
import { startCronJobs } from "../schedulers/sessionCreationJob.js";
import { startCronJobsForScheduledDeletion } from "../schedulers/scheduledDeletionJob.js";
import { startEncryptionKeyRotation } from "../schedulers/encryptionKeyRotationJob.js";
import { initializeEncryptionKeys } from "../services/backendEncryptionService.js";
import { initializeSocketServer } from "./socket.js";
import { apiLimiter } from "../middlewares/rateLimiter.js";

// NEW: Import from modular route structure
import routeIndex from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let io; // Declare io for export

(async () => {
  try {
    const port = process.env.PORT || 3001;
    const DATABASE_URL = process.env.DATABASE_URL;

    // Connect DB & Redis
    await connectDB(DATABASE_URL);
    const redis = await connectRedis();
    
    // Initialize backend encryption keys
    await initializeEncryptionKeys();
    logger.info('🔐 Backend encryption service initialized');

    // Core middlewares
    // Trust proxy - MUST be set before other middleware when behind Nginx
    app.set('trust proxy', 1);
    
    // app.use(pinoHttp({ logger }));
    app.use(helmet());
    app.use(compression());

    const originUrl = process.env.ORIGIN_URL || 'http://localhost:3000';
    const allowedOrigins = originUrl.split(',').map(s => s.trim());
    app.use(cors({ origin: allowedOrigins, credentials: true }));

    app.use(
      "/images",
      express.static(path.join(process.cwd(), "public/images"))
    );
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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

    // Attach io to requests
    const attachIo = (req, _res, next) => {
      req.io = io;
      next();
    };

    // Routes - NOW USING MODULAR STRUCTURE
    app.use("/api", apiLimiter, attachIo, routeIndex);
   
    // 404
    app.use((req, res) =>
      res.status(404).json({ success: false, message: "Route not found" })
    );

    // Error handler
    app.use((err, req, res, next) => {
      logger.error(err.stack);
      res.status(500).json({ success: false, message: "Internal server error" });
    });

    // Cron jobs
    messageCleanupJob.start();
    startCronJobs();
    startCronJobsForScheduledDeletion();
    startEncryptionKeyRotation();

    // Start server
    server.listen(port, () => {
      logger.info(`🚀 Server running on http://localhost:${port}`);
      logger.info(`📁 Using MODULAR architecture from src/modules/`);
    });
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
})();

export { io };
