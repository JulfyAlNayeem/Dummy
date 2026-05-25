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
import alarmRoutes from './routes/alarm.routes.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3007;
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:3002';

app.use(helmet());
app.use(compression());
app.use(cors({ origin: ORIGIN_URL.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'alarm-service', uptime: process.uptime() }));
app.use('/api/alarm', alarmRoutes);
app.use('/api/class-group/alertness', alarmRoutes);

const startServer = async (): Promise<void> => {
  try {
    const redis = await connectRedis();
    const io = await initializeSocketServer(server, redis);
    app.set('io', io);
    (globalThis as any).io = io;
    server.listen(PORT, () => logger.info(`alarm-service running on port ${PORT}`));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start alarm-service');
    process.exit(1);
  }
};

startServer();
export default app;
