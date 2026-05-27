import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import classRoutes from './routes/class.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import { startSessionCreationScheduler } from './jobs/sessionCreation.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3005;
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:3002';

app.use(helmet());
app.use(compression());
app.use(cors({ origin: ORIGIN_URL.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'class-service', uptime: process.uptime() });
});

app.use('/api/class-group/classes', classRoutes);
app.use('/api/class-group/attendance', attendanceRoutes);
app.use('/api/class-group/assignments', assignmentRoutes);

const startServer = async (): Promise<void> => {
  try {
    logger.info('Prisma client ready (lazy connection to MySQL)');

    // Start session creation cron jobs for all active classes
    await startSessionCreationScheduler();
    logger.info('Session creation scheduler started');

    server.listen(PORT, () => {
      logger.info(`class-service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start class-service');
    process.exit(1);
  }
};

startServer();
export default app;
