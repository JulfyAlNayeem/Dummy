import { Server, Socket } from 'socket.io';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

type UserData = {
  _id?: string;
  name?: string;
  email?: string;
  image?: string;
};

export class ConversationGateway {
  private io: Server;
  private activeUsers: Map<string, Map<string, UserData>>;

  constructor(io: Server) {
    this.io = io;
    this.activeUsers = new Map();
  }

  handleConnection(socket: Socket) {
    socket.on('joinRoom', (conversationId: string) => this.handleJoinConversation(socket, conversationId));
    socket.on('leaveRoom', (conversationId: string) => this.handleLeaveConversation(socket, conversationId));

    // Legacy event names for backward compatibility
    socket.on('join:conversation', (conversationId: string) =>
      this.handleJoinConversation(socket, conversationId)
    );
    socket.on('conversation:join', (conversationId: string) =>
      this.handleJoinConversation(socket, conversationId)
    );

    socket.on('leave:conversation', (conversationId: string) =>
      this.handleLeaveConversation(socket, conversationId)
    );
    socket.on('conversation:leave', (conversationId: string) =>
      this.handleLeaveConversation(socket, conversationId)
    );

    socket.on('conversation:getActiveUsers', (conversationId: string) =>
      this.handleGetActiveUsers(socket, conversationId)
    );
    socket.on('conversation:active-users', (conversationId: string) =>
      this.handleGetActiveUsers(socket, conversationId)
    );
  }

  handleDisconnect(socket: Socket, reason: string) {
    const userId = String((socket as any).user?.id || '');

    this.activeUsers.forEach((users, conversationId) => {
      if (!userId || !users.has(userId)) return;

      users.delete(userId);

      const activeUsersList = Array.from(users.values());

      this.io.to(`conv:${conversationId}`).emit('conversation:userLeft', {
        conversationId,
        userId,
        activeUsers: activeUsersList,
      });

      this.io.to(`conv:${conversationId}`).emit('activeUsersUpdate', activeUsersList);

      if (users.size === 0) {
        this.activeUsers.delete(conversationId);
      }
    });

    logger.debug(
      {
        socketId: socket.id,
        userId,
        reason,
      },
      'Conversation gateway disconnect'
    );
  }

  private handleJoinConversation(socket: Socket, conversationId: string) {
    const roomConversationId = String(conversationId || '');
    const userId = String((socket as any).user?.id || '');

    if (!roomConversationId || !userId) return;

    socket.join(`conv:${roomConversationId}`);

    if (!this.activeUsers.has(roomConversationId)) {
      this.activeUsers.set(roomConversationId, new Map());
    }

    const userData: UserData = {
      _id: (socket as any).user?.id,
      name: (socket as any).user?.name,
      email: (socket as any).user?.email,
      image: (socket as any).user?.image,
    };

    this.activeUsers.get(roomConversationId)!.set(userId, userData);

    const activeUsersList = Array.from(this.activeUsers.get(roomConversationId)!.values());

    this.io.to(`conv:${roomConversationId}`).emit('conversation:userJoined', {
      conversationId: roomConversationId,
      userId,
      activeUsers: activeUsersList,
    });

    this.io.to(`conv:${roomConversationId}`).emit('activeUsersUpdate', activeUsersList);

    logger.info(
      {
        socketId: socket.id,
        userId,
        conversationId: roomConversationId,
      },
      'User joined conversation'
    );
  }

  private handleLeaveConversation(socket: Socket, conversationId: string) {
    const roomConversationId = String(conversationId || '');
    const userId = String((socket as any).user?.id || '');

    if (!roomConversationId || !userId) return;

    socket.leave(`conv:${roomConversationId}`);

    if (this.activeUsers.has(roomConversationId)) {
      this.activeUsers.get(roomConversationId)!.delete(userId);
      if (this.activeUsers.get(roomConversationId)!.size === 0) {
        this.activeUsers.delete(roomConversationId);
      }
    }

    const activeUsersList = this.activeUsers.has(roomConversationId)
      ? Array.from(this.activeUsers.get(roomConversationId)!.values())
      : [];

    this.io.to(`conv:${roomConversationId}`).emit('conversation:userLeft', {
      conversationId: roomConversationId,
      userId,
      activeUsers: activeUsersList,
    });

    this.io.to(`conv:${roomConversationId}`).emit('activeUsersUpdate', activeUsersList);

    logger.info(
      {
        socketId: socket.id,
        userId,
        conversationId: roomConversationId,
      },
      'User left conversation'
    );
  }

  private handleGetActiveUsers(socket: Socket, conversationId: string) {
    const roomConversationId = String(conversationId || '');
    if (!roomConversationId) return;

    const activeUsers = this.activeUsers.has(roomConversationId)
      ? Array.from(this.activeUsers.get(roomConversationId)!.values())
      : [];

    socket.emit('conversation:activeUsers', {
      conversationId: roomConversationId,
      activeUsers,
    });

    socket.emit('activeUsersUpdate', activeUsers);
  }
}
