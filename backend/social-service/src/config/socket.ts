import http from 'http';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

let _io: Server | null = null;

export function getIo(): Server | null {
  return _io;
}

export async function setupSocket(server: http.Server, originUrl: string): Promise<Server> {
  const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redis.on('error', (err) => logger.error({ err }, 'Redis error'));
  await redis.connect();

  const io = new Server(server, {
    cors: { origin: originUrl.split(',').map((s) => s.trim()), credentials: true },
    transports: ['websocket', 'polling'],
  });

  const pub = redis.duplicate();
  const sub = redis.duplicate();
  await pub.connect();
  await sub.connect();
  io.adapter(createAdapter(pub, sub));

  // Authenticated users join a personal room for targeted notifications
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;
    if (userId) socket.join(`user:${userId}`);
  });

  _io = io;
  return io;
}
