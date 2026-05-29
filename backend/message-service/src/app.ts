import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { connectRedis } from './config/redis.js';
import { initializeSocketServer } from './socket/index.js';
import messageRoutes from './routes/message.routes.js';
import { messageCleanupJob } from './jobs/messageCleanup.js';

const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3004;
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:3002';

app.use(helmet());
app.use(compression());
app.use(cors({ origin: ORIGIN_URL.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'message-service', uptime: process.uptime() });
});

app.use('/api/messages', messageRoutes);

const startServer = async (): Promise<void> => {
  try {
    logger.info('Prisma client ready (lazy connection to MySQL)');

    const redis = await connectRedis();
    logger.info('Connected to Redis');

    const io = await initializeSocketServer(server, redis);
    app.set('io', io);
    (globalThis as any).io = io;
    logger.info('Socket.IO server initialized');

    messageCleanupJob.start();
    logger.info('Message cleanup cron started');

    server.listen(PORT, () => {
      logger.info(`message-service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start message-service');
    process.exit(1);
  }
};

startServer();
export default app;
