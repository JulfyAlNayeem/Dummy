import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import socialRoutes from './routes/social.routes.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3008;
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:3002';

app.use(helmet());
app.use(compression());
app.use(cors({ origin: ORIGIN_URL.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'social-service', uptime: process.uptime() }));
app.use('/api/social', socialRoutes);

const startServer = async (): Promise<void> => {
  try {
    // Socket.IO for broadcasting post events to all online users
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redis.on('error', (err) => logger.error({ err }, 'Redis error'));
    await redis.connect();

    const io = new Server(server, {
      cors: { origin: ORIGIN_URL.split(',').map((s) => s.trim()), credentials: true },
      transports: ['websocket', 'polling'],
    });
    const pub = redis.duplicate();
    const sub = redis.duplicate();
    await pub.connect();
    await sub.connect();
    io.adapter(createAdapter(pub, sub));

    app.set('io', io);
    (globalThis as any).io = io;

    server.listen(PORT, () => logger.info(`social-service running on port ${PORT}`));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start social-service');
    process.exit(1);
  }
};

startServer();
export default app;
