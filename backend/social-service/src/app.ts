import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { setupSocket } from './config/socket.js';

// ─── Module routes ─────────────────────────────────────────────────────────────
import postRoutes         from './modules/post/post.routes.js';
import commentRoutes      from './modules/comment/comment.routes.js';
import reactionRoutes     from './modules/reaction/reaction.routes.js';
import followRoutes       from './modules/follow/follow.routes.js';
import profileRoutes      from './modules/profile/profile.routes.js';
import pageRoutes         from './modules/page/page.routes.js';
import feedRoutes         from './modules/feed/feed.routes.js';
import storyRoutes        from './modules/story/story.routes.js';
import bookmarkRoutes     from './modules/bookmark/bookmark.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import searchRoutes       from './modules/search/search.routes.js';
import uploadRoutes       from './modules/upload/upload.routes.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT   || 3008;
const ORIGIN = process.env.ORIGIN_URL || 'http://localhost:3002';

// ─── Static files ────────────────────────────────────────────────────────────
app.use('/api/social/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({ origin: ORIGIN.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'social-service', uptime: process.uptime() });
});

// ─── API routes (all under /api/social) ──────────────────────────────────────
const BASE = '/api/social';
app.use(`${BASE}/posts`,          postRoutes);
app.use(`${BASE}`,                commentRoutes);   // /posts/:postId/comments, /comments/:id, /replies/:id
app.use(`${BASE}`,                reactionRoutes);  // /posts/:postId/reactions, /comments/:commentId/reactions
app.use(`${BASE}/follow`,         followRoutes);
app.use(`${BASE}/profile`,        profileRoutes);
app.use(`${BASE}/pages`,          pageRoutes);
app.use(`${BASE}/feed`,           feedRoutes);
app.use(`${BASE}/stories`,        storyRoutes);
app.use(`${BASE}/bookmarks`,      bookmarkRoutes);
app.use(`${BASE}/notifications`,  notificationRoutes);
app.use(`${BASE}/search`,         searchRoutes);
app.use(`${BASE}/upload`,         uploadRoutes);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.status ?? 500).json({ message: err.message ?? 'Internal server error' });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const startServer = async (): Promise<void> => {
  try {
    await setupSocket(server, ORIGIN);
    server.listen(PORT, () => logger.info(`social-service running on port ${PORT}`));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start social-service');
    process.exit(1);
  }
};

startServer();
export default app;
