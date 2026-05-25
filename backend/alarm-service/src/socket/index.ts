import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';

export const initializeSocketServer = async (server: HttpServer, redis: any): Promise<Server> => {
  const origins = (process.env.ORIGIN_URL || 'http://localhost:3002').split(',').map((s) => s.trim());
  const io = new Server(server, { cors: { origin: origins, credentials: true }, transports: ['websocket', 'polling'] });

  const pub = redis.duplicate();
  const sub = redis.duplicate();
  await pub.connect();
  await sub.connect();
  io.adapter(createAdapter(pub, sub));

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return next(new Error('Unauthorized'));
    try { (socket as any).user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'secret'); next(); }
    catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).user?.id;
    if (userId) {
      socket.on('alarm:joinClass', (classId: string) => socket.join(classId));
    }
    socket.on('disconnect', () => {});
  });

  return io;
};
