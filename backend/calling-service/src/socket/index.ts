import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { socketAuthMiddleware, type AuthenticatedSocket } from '../middleware/auth.js';
import { CallGateway } from './callGateway.js';
import { SFUGateway } from './sfuGateway.js';
import type http from 'http';

/**
 * Initialize the Socket.IO signaling server for WebRTC calls.
 * Handles both 1:1 (peer-to-peer) and group (SFU via mediasoup) calls.
 */
export const initializeSignalingServer = (
  server: http.Server,
  redisClient: RedisClientType,
  mediasoupWorkers: any[],
): Server => {
  const io = new Server(server, {
    cors: {
      origin: [
        process.env.ORIGIN_URL || 'http://localhost:3002',
        'http://localhost:3002',
        'http://localhost:3001',
      ],
      credentials: true,
    },
    path: '/calling-socket',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup Redis adapter for horizontal scaling
  setupRedisAdapter(io, redisClient);

  // Auth middleware
  io.use(socketAuthMiddleware as any);

  // Initialize gateways
  const callGateway = new CallGateway(io, redisClient);
  const sfuGateway = new SFUGateway(io, mediasoupWorkers, redisClient);

  io.on('connection', (socket) => {
    const authSocket = socket as unknown as AuthenticatedSocket;
    const userId = authSocket.user?.userId || authSocket.user?.id || authSocket.user?.id;
    console.log(`📞 Call socket connected: ${userId} (${socket.id})`);

    // Join user's personal call room
    socket.join(`call_user_${userId}`);

    // Register gateway handlers
    callGateway.handleConnection(authSocket);
    sfuGateway.handleConnection(authSocket);

    socket.on('disconnect', (reason: string) => {
      console.log(`📞 Call socket disconnected: ${userId} (${reason})`);
      callGateway.handleDisconnect(authSocket, reason);
      sfuGateway.handleDisconnect(authSocket);
    });
  });

  return io;
};

/**
 * Setup Redis adapter for Socket.IO
 */
async function setupRedisAdapter(io: Server, redisClient: RedisClientType): Promise<void> {
  try {
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis adapter configured for calling service');
  } catch (error) {
    console.error('Failed to setup Redis adapter:', error);
  }
}
