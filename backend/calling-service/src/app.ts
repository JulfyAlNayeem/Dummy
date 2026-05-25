import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { connectRedis } from './config/redisClient.js';
import { initializeSignalingServer } from './socket/index.js';
import { initializeMediasoup } from './config/mediasoup.js';
import callRoutes from './routes/callRoutes.js';

const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

const app: express.Express = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3003;
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:3002';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [ORIGIN_URL, 'http://localhost:3002', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'calling-service', uptime: process.uptime() });
});

// API Routes
app.use('/calls', callRoutes);

// Startup
const startServer = async (): Promise<void> => {
  try {
    // Prisma connects lazily on first query - no explicit connectDB() needed
    logger.info('Prisma client ready (lazy connection to MySQL)');

    // Connect to Redis
    const redis = await connectRedis();
    logger.info('Connected to Redis');

    // Initialize mediasoup workers (optional - P2P 1:1 calls work without it)
    let mediasoupWorkers: any[] = [];
    try {
      mediasoupWorkers = await initializeMediasoup();
      if (mediasoupWorkers.length > 0) {
        logger.info(`Mediasoup initialized with ${mediasoupWorkers.length} worker(s)`);
      } else {
        logger.warn('Mediasoup not available - running in P2P-only mode (1:1 calls)');
      }
    } catch (err: any) {
      logger.warn('Mediasoup init failed - running in P2P-only mode:', err.message);
    }

    // Initialize Socket.IO signaling server
    const io = initializeSignalingServer(server, redis, mediasoupWorkers);
    (globalThis as any).io = io;
    app.set('io', io);
    logger.info('Signaling server initialized');

    server.listen(PORT, () => {
      logger.info(`Calling service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start calling service');
    process.exit(1);
  }
};

startServer();

export default app;
