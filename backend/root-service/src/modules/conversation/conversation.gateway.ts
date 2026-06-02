import { Server, Socket } from 'socket.io';
import logger from '../../common/utils/logger.js';
import { resetUnreadRequestCount } from './conversation.controller.js';

type ActiveUser = {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
};

export class ConversationGateway {
  private readonly io: Server;
  private readonly activeUsers = new Map<string, Map<string, ActiveUser>>();

  constructor(io: Server) {
    this.io = io;
  }

  handleConnection(socket: Socket): void {
    socket.on('joinRoom', (id) => this.handleJoinConversation(socket, id));
    socket.on('leaveRoom', (id) => this.handleLeaveConversation(socket, id));
    socket.on('join:conversation', (id) => this.handleJoinConversation(socket, id));
    socket.on('conversation:join', (id) => this.handleJoinConversation(socket, id));
    socket.on('leave:conversation', (id) => this.handleLeaveConversation(socket, id));
    socket.on('conversation:leave', (id) => this.handleLeaveConversation(socket, id));
    socket.on('conversation:getActiveUsers', (id) => this.handleGetActiveUsers(socket, id));
    socket.on('conversation:active-users', (id) => this.handleGetActiveUsers(socket, id));
    socket.on('reset_unread_request', (type) => this.handleResetUnreadRequest(socket, type));
  }

  private async handleJoinConversation(socket: any, conversationId: string): Promise<void> {
    const userId = socket.user?.id;
    socket.join(`conv:${conversationId}`);

    if (!this.activeUsers.has(conversationId)) this.activeUsers.set(conversationId, new Map());

    const userData: ActiveUser = {
      id: socket.user?.id,
      name: socket.user?.name,
      email: socket.user?.email,
      image: socket.user?.image,
    };

    this.activeUsers.get(conversationId)?.set(userId, userData);

    const activeUsersMap = this.activeUsers.get(conversationId) ?? new Map<string, ActiveUser>();
    const activeUsersList = Array.from(activeUsersMap.values());

    this.io
      .to(`conv:${conversationId}`)
      .emit('conversation:userJoined', { conversationId, userId, activeUsers: activeUsersList });
    this.io.to(`conv:${conversationId}`).emit('activeUsersUpdate', activeUsersList);

    logger.info({ socketId: socket.id, userId, conversationId }, 'User joined conversation');
  }

  private handleLeaveConversation(socket: any, conversationId: string): void {
    const userId = socket.user?.id;
    socket.leave(`conv:${conversationId}`);

    if (this.activeUsers.has(conversationId)) {
      this.activeUsers.get(conversationId)?.delete(userId);
      if ((this.activeUsers.get(conversationId)?.size ?? 0) === 0) this.activeUsers.delete(conversationId);
    }

    const activeUsersList = this.activeUsers.has(conversationId)
      ? Array.from(this.activeUsers.get(conversationId)?.values() ?? [])
      : [];

    this.io
      .to(`conv:${conversationId}`)
      .emit('conversation:userLeft', { conversationId, userId, activeUsers: activeUsersList });
    this.io.to(`conv:${conversationId}`).emit('activeUsersUpdate', activeUsersList);
  }

  private handleGetActiveUsers(socket: Socket, conversationId: string): void {
    const activeUsers = this.activeUsers.has(conversationId)
      ? Array.from(this.activeUsers.get(conversationId)?.values() ?? [])
      : [];

    socket.emit('conversation:activeUsers', { conversationId, activeUsers });
    socket.emit('activeUsersUpdate', activeUsers);
  }

  private async handleResetUnreadRequest(
    socket: any,
    requestType: 'friend' | 'group' | 'classroom'
  ): Promise<void> {
    const userId = socket.user?.id;
    if (!userId) return;

    try {
      const updatedCounts = await resetUnreadRequestCount(userId, requestType);
      socket.emit('unread_counts_updated', updatedCounts);
    } catch (error) {
      logger.error({ error, userId, requestType }, 'Error resetting unread request count');
      socket.emit('error', { message: 'Failed to reset unread request count' });
    }
  }

  handleDisconnect(socket: any, _reason: string): void {
    const userId = socket.user?.id;

    this.activeUsers.forEach((users, conversationId) => {
      if (users.has(userId)) {
        users.delete(userId);
        const activeUsersList = Array.from(users.values());

        this.io
          .to(`conv:${conversationId}`)
          .emit('conversation:userLeft', { conversationId, userId, activeUsers: activeUsersList });
        this.io.to(`conv:${conversationId}`).emit('activeUsersUpdate', activeUsersList);

        if (users.size === 0) this.activeUsers.delete(conversationId);
      }
    });
  }
}
