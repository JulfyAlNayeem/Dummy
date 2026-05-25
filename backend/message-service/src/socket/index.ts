import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import prisma from '../config/database.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

// Track userId → Set<socketId>
const userSockets = new Map<string, Set<string>>();

export const initializeSocketServer = async (server: HttpServer, redis: any): Promise<Server> => {
  const allowedOrigins = (process.env.ORIGIN_URL || 'http://localhost:3002').split(',').map((s) => s.trim());

  const io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Socket.IO Redis adapter configured');

  // Auth middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.cookie?.match(/accessToken=([^;]+)/)?.[1];

    if (!token) return next(new Error('Unauthorized'));

    try {
      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'secret') as any;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = (socket as any).user;
    if (!user?.id) return;

    const userId = user.id as string;

    // Track socket
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // Auto-join all conversation rooms
    try {
      const participants = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const { conversationId } of participants) {
        socket.join(`conv:${conversationId}`);
        socket.join(conversationId);
      }
      socket.join(`user_${userId}`);
      logger.info({ userId, rooms: participants.length }, 'User joined conversation rooms');
    } catch (err) {
      logger.error({ err }, 'Error joining conversation rooms');
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    socket.on('message:joinRoom', (convId: string) => {
      socket.join(`conv:${convId}`);
      socket.join(convId);
    });

    socket.on('message:typing', ({ conversationId, isTyping }: any) => {
      socket.to(`conv:${conversationId}`).emit('message:typing', {
        userId,
        conversationId,
        isTyping,
      });
    });

    // Legacy aliases
    socket.on('joinRoom', (convId: string) => socket.join(`conv:${convId}`));
    socket.on('typing', (data: any) => socket.to(`conv:${data.conversationId}`).emit('typing', { ...data, userId }));

    socket.on('refreshConversationRooms', async () => {
      const parts = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const { conversationId } of parts) {
        socket.join(`conv:${conversationId}`);
        socket.join(conversationId);
      }
      socket.emit('conversationRoomsRefreshed');
    });

    socket.on('disconnect', () => {
      userSockets.get(userId)?.delete(socket.id);
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
      logger.info({ userId, socketId: socket.id }, 'User disconnected');
    });
  });

  return io;
};
