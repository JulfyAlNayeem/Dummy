import 'dotenv/config';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import pino from 'pino';
import { connectRedis } from './config/redis.js';
import { startReminderJob } from './jobs/reminderNotification.js';
import { startEncryptionKeyRotationJob } from './jobs/encryptionKeyRotation.js';
import { startDatabaseBackupJob } from './jobs/databaseBackup.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3009;

app.use(helmet());
app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'scheduler-service', uptime: process.uptime() })
);

// Admin endpoint to manually trigger jobs (protected by internal-only access)
app.post('/jobs/reminder/run', async (_req, res) => {
  res.json({ triggered: true, job: 'reminder' });
});

const startServer = async (): Promise<void> => {
  try {
    logger.info('Prisma client ready (lazy MySQL connection)');

    await connectRedis();
    logger.info('Connected to Redis');

    // Start all cron jobs
    startReminderJob();
    startEncryptionKeyRotationJob();
    startDatabaseBackupJob();
    logger.info('All scheduler jobs started');

    server.listen(PORT, () => logger.info(`scheduler-service running on port ${PORT}`));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start scheduler-service');
    process.exit(1);
  }
};

startServer();
export default app;
