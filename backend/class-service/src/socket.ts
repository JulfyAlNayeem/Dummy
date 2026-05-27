import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import pino from 'pino';
import { AlertnessGateway } from './modules/alertness/index.js';
import { ConversationGateway } from './modules/conversation/index.js';
import { attachSocketUser } from './socket/socket.auth.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

export function initializeSocketServer(server: HttpServer, originUrl: string): Server {
  const allowedOrigins = originUrl.split(',').map((s) => s.trim());

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
  });

  const alertnessGateway = new AlertnessGateway(io);
  const conversationGateway = new ConversationGateway(io);

  io.use((socket, next) => {
    attachSocketUser(socket as Socket);
    next();
  });

  io.on('connection', (socket: Socket) => {
    logger.info(
      {
        socketId: socket.id,
        userId: (socket as any).user?.id,
      },
      'Socket connected'
    );

    alertnessGateway.handleConnection(socket);
    conversationGateway.handleConnection(socket);

    socket.on('disconnect', (reason) => {
      logger.info(
        {
          socketId: socket.id,
          userId: (socket as any).user?.id,
          reason,
        },
        'Socket disconnected'
      );
      alertnessGateway.handleDisconnect(socket, reason);
      conversationGateway.handleDisconnect(socket, reason);
    });
  });

  return io;
}
