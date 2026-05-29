import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import prisma from '../config/database.js';
import { decryptMessage, encryptMessage, isBackendEncrypted } from '../services/encryptionService.js';
import { decryptTransportText, isSMTEEncrypted } from '../services/smteService.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

// Track userId → Set<socketId>
const userSockets = new Map<string, Set<string>>();

function formatMessage(msg: any, clientTempId?: string): any {
  if (!msg) return msg;
  const out: any = {
    ...msg,
    _id: msg.id,
    conversation: msg.conversationId,
  };
  if (clientTempId !== undefined) out.clientTempId = clientTempId;
  if (msg.sender && typeof msg.sender === 'object') {
    out.sender = { ...msg.sender, username: msg.sender.name };
  }
  if (Array.isArray(msg.deletedBy)) out.deletedBy = msg.deletedBy.map((d: any) => d.userId ?? d);
  if (Array.isArray(msg.readBy)) {
    out.readBy = msg.readBy.map((r: any) => (r.userId ? { user: r.userId, readAt: r.readAt } : r));
  }
  return out;
}

function computeDeletionTime(autoDeleteHours: number): Date | null {
  if (!autoDeleteHours || autoDeleteHours <= 0) return null;
  return new Date(Date.now() + autoDeleteHours * 3600 * 1000);
}

async function getAutoDeleteHours(conversationId: string): Promise<number> {
  try {
    const conv = await (prisma as any).conversation.findUnique({
      where: { id: conversationId },
      select: { autoDeleteMessagesAfter: true },
    });
    const hours = Number(conv?.autoDeleteMessagesAfter ?? 24);
    return Number.isFinite(hours) && hours > 0 ? hours : 24;
  } catch {
    // Fallback for environments where DB column is snake_case but Prisma mapping is out-of-sync.
    try {
      const rows = await prisma.$queryRaw<Array<{ autoDeleteMessagesAfter: number | null }>>`
        SELECT auto_delete_messages_after AS autoDeleteMessagesAfter
        FROM conversations
        WHERE id = ${conversationId}
        LIMIT 1
      `;
      const hours = Number(rows?.[0]?.autoDeleteMessagesAfter ?? 24);
      return Number.isFinite(hours) && hours > 0 ? hours : 24;
    } catch {
      return 24;
    }
  }
}

async function tryDecryptText(text: string | null): Promise<string | null> {
  if (!text || !isBackendEncrypted(text)) return text;
  try {
    return await decryptMessage(text);
  } catch {
    return text;
  }
}

async function encryptIfNeeded(text?: string, conversationId?: string): Promise<{ text: string | null; encrypted: boolean }> {
  if (!text || typeof text !== 'string') return { text: null, encrypted: false };

  // SMTE transport encrypted payload: decrypt transport, then encrypt at rest.
  if (conversationId && isSMTEEncrypted(text)) {
    try {
      const plain = await decryptTransportText(text, conversationId);
      const encrypted = await encryptMessage(plain);
      return { text: encrypted, encrypted: true };
    } catch (err) {
      logger.warn({ err }, 'SMTE decrypt failed, storing as-is');
      return { text, encrypted: false };
    }
  }

  // Legacy marker compatibility.
  if (text.startsWith('__BACKEND_ENCRYPT__:')) {
    const actual = text.slice('__BACKEND_ENCRYPT__:'.length);
    try {
      const encrypted = await encryptMessage(actual);
      return { text: encrypted, encrypted: true };
    } catch (err) {
      logger.warn({ err }, 'Backend encrypt failed, storing plaintext');
      return { text: actual, encrypted: false };
    }
  }

  if (isBackendEncrypted(text)) return { text, encrypted: true };

  return { text, encrypted: false };
}

export const initializeSocketServer = async (server: HttpServer, redis: any): Promise<Server> => {
  const allowedOrigins = (process.env.ORIGIN_URL || 'http://localhost:3002').split(',').map((s) => s.trim());
  const socketPath = process.env.MESSAGE_SOCKET_PATH || '/message-socket';

  const io = new Server(server, {
    path: socketPath,
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
    socket.on('leaveRoom', (convId: string) => {
      socket.leave(`conv:${convId}`);
      socket.leave(convId);
    });
    socket.on('typing', (data: any) => socket.to(`conv:${data.conversationId}`).emit('typing', { ...data, userId }));

    socket.on('sendMessage', async (data: any) => {
      const { conversationId, sender, receiver, text, clientTempId } = data ?? {};
      const senderId = sender || userId;

      if (!senderId) {
        socket.emit('sendMessageError', { message: 'Unauthorized', clientTempId });
        return;
      }

      try {
        let convId: string | undefined = conversationId;
        if (!convId && receiver) {
          const existing = await (prisma as any).conversation.findFirst({
            where: {
              isGroup: false,
              AND: [
                { participants: { some: { userId: senderId } } },
                { participants: { some: { userId: receiver } } },
              ],
            },
          });
          convId = existing?.id;

          if (!convId) {
            const newConv = await (prisma as any).conversation.create({
              data: {
                isGroup: false,
                participants: { create: [{ userId: senderId }, { userId: receiver }] },
              } as any,
            });
            convId = newConv.id;
          }
        }

        if (!convId) {
          socket.emit('sendMessageError', { message: 'conversationId or receiver required', clientTempId });
          return;
        }

        const deletionTime = computeDeletionTime(await getAutoDeleteHours(convId));
        const enc = await encryptIfNeeded(text, convId);

        const message = await prisma.message.create({
          data: {
            conversationId: convId,
            senderId,
            receiverId: receiver || null,
            text: enc.text,
            isBackendEncrypted: enc.encrypted,
            messageType: 'text',
            scheduledDeletionTime: deletionTime,
          } as any,
          include: {
            sender: { select: { id: true, name: true, image: true } },
            media: true,
          },
        });

        (prisma as any).conversation.update({
          where: { id: convId },
          data: {
            lastMessageText: text?.slice(0, 255) ?? '',
            lastMessageSenderId: senderId,
            lastMessageTimestamp: new Date(),
          },
        }).catch(() => {});

        const responseMsg = formatMessage({ ...message, text: await tryDecryptText(enc.text) }, clientTempId);
        io.to(`conv:${convId}`).emit('receiveMessage', responseMsg);
        io.to(convId).emit('receiveMessage', responseMsg);
        socket.emit('sendMessageSuccess', { message: responseMsg, conversationId: convId });
      } catch (err: any) {
        logger.error({ err }, 'sendMessage socket handler error');
        socket.emit('sendMessageError', { message: err.message || 'Server error', clientTempId });
      }
    });

    socket.on('message:send', (data: any) => socket.emit('sendMessage', data));

    socket.on('sendEmoji', async (data: any) => {
      const { conversationId, sender, receiver, data: emojiData, clientTempId } = data ?? {};
      const senderId = sender || userId;
      if (!senderId || !emojiData) {
        socket.emit('sendMessageError', { message: 'Invalid sender or emoji data', clientTempId });
        return;
      }

      const { text, htmlEmoji, emojiType } = emojiData;

      try {
        if (!conversationId) {
          socket.emit('sendMessageError', { message: 'conversationId required', clientTempId });
          return;
        }

        const deletionTime = computeDeletionTime(await getAutoDeleteHours(conversationId));

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId,
            receiverId: receiver || null,
            text: text || null,
            htmlEmoji: htmlEmoji || null,
            emojiType: emojiType || null,
            isBackendEncrypted: false,
            messageType: 'text',
            scheduledDeletionTime: deletionTime,
          } as any,
          include: {
            sender: { select: { id: true, name: true, image: true } },
            media: true,
          },
        });

        const responseMsg = formatMessage(message, clientTempId);
        io.to(`conv:${conversationId}`).emit('receiveMessage', responseMsg);
        io.to(conversationId).emit('receiveMessage', responseMsg);
        socket.emit('sendMessageSuccess', { message: responseMsg, conversationId });
      } catch (err: any) {
        logger.error({ err }, 'sendEmoji socket handler error');
        socket.emit('sendMessageError', { message: err.message || 'Server error', clientTempId });
      }
    });

    socket.on('message:sendEmoji', (data: any) => socket.emit('sendEmoji', data));

    socket.on('messageRead', async (data: any) => {
      const { conversationId, userId: payloadUserId } = data ?? {};
      const uid = payloadUserId || userId;
      if (!conversationId || !uid) return;

      try {
        await prisma.$executeRaw`
          UPDATE messages
          SET status = 'read'
          WHERE conversationId = ${conversationId}
            AND receiverId = ${uid}
            AND status != 'read'
        `;

        try {
          await prisma.$executeRaw`
            INSERT IGNORE INTO message_read_by (id, messageId, userId, readAt)
            SELECT UUID(), id, ${uid}, NOW()
            FROM messages
            WHERE conversationId = ${conversationId}
              AND receiverId = ${uid}
          `;
        } catch {
          // non-critical
        }

        const updatedMessages = await prisma.message.findMany({
          where: { conversationId, receiverId: uid },
          select: { id: true },
        });
        const messageIds = updatedMessages.map((m) => m.id);
        if (messageIds.length > 0) {
          io.to(conversationId).emit('messagesRead', { conversationId, userId: uid, messageIds });
          io.to(`conv:${conversationId}`).emit('messagesRead', { conversationId, userId: uid, messageIds });
        }
      } catch (err: any) {
        logger.error({ err }, 'messageRead socket handler error');
      }
    });

    socket.on('message:read', (data: any) => socket.emit('messageRead', data));

    socket.on('messageDelivered', async (data: any) => {
      const { conversationId, userId: payloadUserId } = data ?? {};
      const uid = payloadUserId || userId;
      if (!conversationId || !uid) return;

      try {
        await prisma.$executeRaw`
          UPDATE messages
          SET status = 'delivered'
          WHERE conversationId = ${conversationId}
            AND receiverId = ${uid}
            AND status = 'sent'
        `;

        const deliveredMessages = await prisma.message.findMany({
          where: { conversationId, receiverId: uid, status: 'delivered' as any },
          select: { id: true },
        });
        const messageIds = deliveredMessages.map((m) => m.id);
        if (messageIds.length > 0) {
          io.to(conversationId).emit('messagesDelivered', { conversationId, userId: uid, messageIds });
          io.to(`conv:${conversationId}`).emit('messagesDelivered', { conversationId, userId: uid, messageIds });
        }
      } catch (err: any) {
        logger.error({ err }, 'messageDelivered socket handler error');
      }
    });

    socket.on('message:delivered', (data: any) => socket.emit('messageDelivered', data));

    socket.on('deleteMessage', async (data: any) => {
      const { messageId, userId: payloadUserId } = data ?? {};
      const uid = payloadUserId || userId;

      if (!messageId) {
        socket.emit('deleteMessageError', { message: 'messageId required' });
        return;
      }

      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: { media: true },
        });

        if (!message) {
          socket.emit('deleteMessageError', { message: 'Message not found' });
          return;
        }

        const convId = message.conversationId;
        let hardDelete = false;
        if (message.senderId === uid) {
          await prisma.message.delete({ where: { id: messageId } });
          hardDelete = true;
        } else {
          try {
            await prisma.$executeRaw`
              INSERT IGNORE INTO message_deleted_by (id, messageId, userId)
              VALUES (UUID(), ${messageId}, ${uid})
            `;
          } catch {
            // non-critical
          }
        }

        io.to(convId).emit('messageDeleted', { messageId, userId: uid, hardDelete });
        io.to(`conv:${convId}`).emit('messageDeleted', { messageId, userId: uid, hardDelete });
      } catch (err: any) {
        logger.error({ err }, 'deleteMessage socket handler error');
        socket.emit('deleteMessageError', { message: err.message || 'Server error' });
      }
    });

    socket.on('message:delete', (data: any) => socket.emit('deleteMessage', data));

    socket.on('replyMessage', async (data: any) => {
      const { conversationId, messageId, text, htmlEmoji, emojiType, clientTempId } = data ?? {};

      if (!conversationId || !messageId || !clientTempId) {
        socket.emit('replyMessageError', {
          message: 'Missing required fields: conversationId, messageId or clientTempId',
          clientTempId,
        });
        return;
      }

      try {
        const originalMessage = await prisma.message.findUnique({ where: { id: messageId } });
        if (!originalMessage) {
          socket.emit('replyMessageError', { message: 'Original message not found', clientTempId });
          return;
        }

        const deletionTime = computeDeletionTime(await getAutoDeleteHours(conversationId));
        const enc = await encryptIfNeeded(text, conversationId);

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            text: enc.text,
            htmlEmoji: htmlEmoji || null,
            emojiType: emojiType || null,
            isBackendEncrypted: enc.encrypted,
            messageType: 'text',
            replyToId: messageId,
            scheduledDeletionTime: deletionTime,
          } as any,
          include: {
            sender: { select: { id: true, name: true, image: true } },
            media: true,
            replyTo: {
              include: {
                sender: { select: { id: true, name: true } },
                media: true,
              },
            },
          },
        });

        const responseMsg = formatMessage({ ...message, text: await tryDecryptText(enc.text) }, clientTempId);
        io.to(conversationId).emit('replyReceiveMessage', responseMsg);
        io.to(conversationId).emit('message:reply', responseMsg);
        io.to(`conv:${conversationId}`).emit('replyReceiveMessage', responseMsg);
        io.to(`conv:${conversationId}`).emit('message:reply', responseMsg);
        socket.emit('replyMessageSuccess', { message: responseMsg, conversationId, clientTempId });
      } catch (err: any) {
        logger.error({ err }, 'replyMessage socket handler error');
        socket.emit('replyMessageError', { message: err.message || 'Server error', clientTempId });
      }
    });

    socket.on('message:reply', (data: any) => socket.emit('replyMessage', data));

    socket.on('editMessage', async (data: any) => {
      const { messageId, text, htmlEmoji, emojiType, clientTempId } = data ?? {};

      if (!messageId || !clientTempId) {
        socket.emit('editMessageError', { message: 'Missing required fields', clientTempId });
        return;
      }

      try {
        const existing = await prisma.message.findUnique({ where: { id: messageId } });
        if (!existing) {
          socket.emit('editMessageError', { message: 'Message not found', clientTempId });
          return;
        }
        if (existing.senderId !== userId) {
          socket.emit('editMessageError', { message: 'Unauthorized to edit this message', clientTempId });
          return;
        }

        try {
          await prisma.$executeRaw`
            INSERT INTO message_edit_history (id, messageId, oldText, editedAt)
            VALUES (UUID(), ${messageId}, ${existing.text ?? ''}, NOW())
          `;
        } catch {
          // non-critical
        }

        let newText: string | null = existing.text;
        let isEncrypted = existing.isBackendEncrypted;
        if (text !== undefined) {
          const enc = await encryptIfNeeded(text, existing.conversationId);
          newText = enc.text;
          isEncrypted = enc.encrypted;
        }

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: {
            text: newText,
            htmlEmoji: htmlEmoji !== undefined ? (htmlEmoji || null) : (existing as any).htmlEmoji,
            emojiType: emojiType !== undefined ? (emojiType || null) : (existing as any).emojiType,
            isBackendEncrypted: isEncrypted,
            edited: true,
          } as any,
          include: {
            sender: { select: { id: true, name: true, image: true } },
            media: true,
          },
        });

        const convId = existing.conversationId;
        const responseMsg = formatMessage({ ...updated, text: await tryDecryptText(newText) }, clientTempId);
        io.to(convId).emit('messageEdited', responseMsg);
        io.to(convId).emit('message:edited', responseMsg);
        io.to(`conv:${convId}`).emit('messageEdited', responseMsg);
        io.to(`conv:${convId}`).emit('message:edited', responseMsg);
        socket.emit('editMessageSuccess', { message: responseMsg, clientTempId });
      } catch (err: any) {
        logger.error({ err }, 'editMessage socket handler error');
        socket.emit('editMessageError', { message: err.message || 'Server error', clientTempId });
      }
    });

    socket.on('message:edit', (data: any) => socket.emit('editMessage', data));

    socket.on('addReaction', async (data: any) => {
      const { messageId, reaction, clientTempId } = data ?? {};
      const username = (socket as any).user?.name;

      if (!messageId || !reaction) {
        socket.emit('reactionError', { message: 'Missing messageId or reaction', clientTempId });
        return;
      }

      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { id: true, conversationId: true, reactions: true },
        });
        if (!message) {
          socket.emit('reactionError', { message: 'Message not found', clientTempId });
          return;
        }

        const reactions: Record<string, any> = (message.reactions as any) ?? {};
        reactions[userId] = { emoji: reaction, username };

        await prisma.message.update({ where: { id: messageId }, data: { reactions: reactions as any } });

        const convId = message.conversationId;
        io.to(convId).emit('reactionsUpdated', { messageId, reactions, conversationId: convId });
        io.to(`conv:${convId}`).emit('reactionsUpdated', { messageId, reactions, conversationId: convId });
        socket.emit('reactionSuccess', { messageId, reaction, clientTempId });
      } catch (err: any) {
        logger.error({ err }, 'addReaction socket handler error');
        socket.emit('reactionError', { message: err.message || 'Server error', clientTempId });
      }
    });

    socket.on('message:react', (data: any) => socket.emit('addReaction', data));

    socket.on('removeReaction', async (data: any) => {
      const { messageId, reaction, clientTempId } = data ?? {};
      if (!messageId) {
        socket.emit('unreactionError', { message: 'Missing messageId', clientTempId });
        return;
      }

      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { id: true, conversationId: true, reactions: true },
        });
        if (!message) {
          socket.emit('unreactionError', { message: 'Message not found', clientTempId });
          return;
        }

        const reactions: Record<string, any> = (message.reactions as any) ?? {};
        delete reactions[userId];

        await prisma.message.update({ where: { id: messageId }, data: { reactions: reactions as any } });

        const convId = message.conversationId;
        io.to(convId).emit('reactionsUpdated', { messageId, reactions, conversationId: convId });
        io.to(`conv:${convId}`).emit('reactionsUpdated', { messageId, reactions, conversationId: convId });
        socket.emit('unreactionSuccess', { messageId, reaction, clientTempId });
      } catch (err: any) {
        logger.error({ err }, 'removeReaction socket handler error');
        socket.emit('unreactionError', { message: err.message || 'Server error', clientTempId });
      }
    });

    socket.on('message:unreact', (data: any) => socket.emit('removeReaction', data));

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
