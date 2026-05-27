/**
 * Message Gateway
 * Handles all message-related WebSocket events.
 * Mirrors backend-old's message.gateway.js with exact event names.
 *
 * Incoming events:
 *   sendMessage / message:send
 *   sendEmoji   / message:sendEmoji
 *   typing      / message:typing
 *   messageRead / message:read
 *   messageDelivered / message:delivered
 *   deleteMessage    / message:delete
 *   replyMessage     / message:reply
 *   editMessage      / message:edit
 *   addReaction      / message:react
 *   removeReaction   / message:unreact
 *
 * Outgoing events:
 *   receiveMessage, sendMessageSuccess, sendMessageError
 *   messagesRead, messagesDelivered
 *   messageDeleted, deleteMessageError
 *   replyReceiveMessage, replyMessageSuccess, replyMessageError
 *   messageEdited, message:edited, editMessageSuccess, editMessageError
 *   reactionsUpdated, reactionSuccess, reactionError
 *   unreactionSuccess, unreactionError
 */

import { Server, Socket } from 'socket.io';
import logger from '../../common/utils/logger.js';
import prisma from '../../config/database.js';
import {
  encryptMessage as backendEncrypt,
  decryptMessage as backendDecrypt,
  isBackendEncrypted,
} from '../../services/backendEncryptionService.js';
import {
  decryptTransportText,
  isSMTEEncrypted,
} from '../../services/smteService.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  if (Array.isArray(msg.deletedBy))
    out.deletedBy = msg.deletedBy.map((d: any) => d.userId ?? d);
  if (Array.isArray(msg.readBy))
    out.readBy = msg.readBy.map((r: any) =>
      r.userId ? { user: r.userId, readAt: r.readAt } : r
    );
  return out;
}

function computeDeletionTime(autoDeleteHours: number): Date | null {
  if (!autoDeleteHours || autoDeleteHours <= 0) return null;
  return new Date(Date.now() + autoDeleteHours * 3600 * 1000);
}

async function handleTextEncryption(
  text: string,
  conversationId: string
): Promise<{ text: string; isBackendEncrypted: boolean }> {
  if (!text || typeof text !== 'string') return { text, isBackendEncrypted: false };

  // SMTE transport layer → decrypt then re-encrypt at rest
  if (isSMTEEncrypted(text) && conversationId) {
    try {
      const plain = await decryptTransportText(text, conversationId);
      const enc = await backendEncrypt(plain);
      return { text: enc, isBackendEncrypted: true };
    } catch (err) {
      logger.warn({ err }, 'SMTE decrypt failed, storing as-is');
      return { text, isBackendEncrypted: false };
    }
  }

  // Legacy marker
  if (text.startsWith('__BACKEND_ENCRYPT__:')) {
    const actual = text.slice('__BACKEND_ENCRYPT__:'.length);
    try {
      const enc = await backendEncrypt(actual);
      return { text: enc, isBackendEncrypted: true };
    } catch (err) {
      logger.warn({ err }, 'Backend encrypt failed, storing plaintext');
      return { text: actual, isBackendEncrypted: false };
    }
  }

  if (isBackendEncrypted(text)) return { text, isBackendEncrypted: true };

  return { text, isBackendEncrypted: false };
}

async function tryDecryptText(text: string | null): Promise<string | null> {
  if (!text) return text;
  if (!isBackendEncrypted(text)) return text;
  try {
    return await backendDecrypt(text);
  } catch {
    return text;
  }
}

// ─── Gateway ─────────────────────────────────────────────────────────────────

export class MessageGateway {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  handleConnection(socket: Socket) {
    socket.on('sendMessage',   (d: any) => this.handleSendMessage(socket, d));
    socket.on('message:send',  (d: any) => this.handleSendMessage(socket, d));

    socket.on('sendEmoji',          (d: any) => this.handleSendEmoji(socket, d));
    socket.on('message:sendEmoji',  (d: any) => this.handleSendEmoji(socket, d));

    socket.on('typing',         (d: any) => this.handleTyping(socket, d));
    socket.on('message:typing', (d: any) => this.handleTyping(socket, d));

    socket.on('messageRead',  (d: any) => this.handleMessageRead(socket, d));
    socket.on('message:read', (d: any) => this.handleMessageRead(socket, d));

    socket.on('messageDelivered',  (d: any) => this.handleMessageDelivered(socket, d));
    socket.on('message:delivered', (d: any) => this.handleMessageDelivered(socket, d));

    socket.on('deleteMessage',  (d: any) => this.handleDeleteMessage(socket, d));
    socket.on('message:delete', (d: any) => this.handleDeleteMessage(socket, d));

    socket.on('replyMessage',  (d: any) => this.handleReplyMessage(socket, d));
    socket.on('message:reply', (d: any) => this.handleReplyMessage(socket, d));

    socket.on('editMessage',  (d: any) => this.handleEditMessage(socket, d));
    socket.on('message:edit', (d: any) => this.handleEditMessage(socket, d));

    socket.on('addReaction',    (d: any) => this.handleAddReaction(socket, d));
    socket.on('message:react',  (d: any) => this.handleAddReaction(socket, d));

    socket.on('removeReaction',   (d: any) => this.handleRemoveReaction(socket, d));
    socket.on('message:unreact',  (d: any) => this.handleRemoveReaction(socket, d));
  }

  // ─── sendMessage ───────────────────────────────────────────────────────────

  async handleSendMessage(socket: Socket, data: any) {
    const { conversationId, sender, receiver, text, clientTempId } = data ?? {};
    const userId = (socket as any).user?.id;
    const senderId = sender || userId;

    if (!senderId) {
      socket.emit('sendMessageError', { message: 'Unauthorized', clientTempId });
      return;
    }

    try {
      // Resolve conversation
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

      const conv = await prisma.conversation.findUnique({ where: { id: convId } });
      const deletionTime = conv ? computeDeletionTime((conv as any).autoDeleteMessagesAfter ?? 24) : null;

      let finalText: string | null = null;
      let isEncrypted = false;
      if (text) {
        const enc = await handleTextEncryption(text, convId);
        finalText = enc.text;
        isEncrypted = enc.isBackendEncrypted;
      }

      const message = await prisma.message.create({
        data: {
          conversationId: convId,
          senderId,
          receiverId: receiver || null,
          text: finalText,
          isBackendEncrypted: isEncrypted,
          messageType: 'text',
          scheduledDeletionTime: deletionTime,
        } as any,
        include: {
          sender: { select: { id: true, name: true, image: true } },
          media: true,
        },
      });

      // Update conversation's last message fields
      (prisma as any).conversation.update({
        where: { id: convId },
        data: {
          lastMessageText: text?.slice(0, 255) ?? '',
          lastMessageSenderId: senderId,
          lastMessageTimestamp: new Date(),
        },
      }).catch(() => {});

      const decryptedText = await tryDecryptText(finalText);
      const responseMsg = formatMessage({ ...message, text: decryptedText }, clientTempId);

      this.io.to(`conv:${convId}`).emit('receiveMessage', responseMsg);
      this.io.to(convId).emit('receiveMessage', responseMsg);
      socket.emit('sendMessageSuccess', { message: responseMsg, conversationId: convId });

      logger.debug({ convId, senderId, clientTempId }, 'sendMessage: success');
    } catch (err: any) {
      logger.error({ err }, 'handleSendMessage error');
      socket.emit('sendMessageError', { message: err.message || 'Server error', clientTempId });
    }
  }

  // ─── sendEmoji ─────────────────────────────────────────────────────────────

  async handleSendEmoji(socket: Socket, data: any) {
    const { conversationId, sender, receiver, data: emojiData, clientTempId } = data ?? {};
    const userId = (socket as any).user?.id;
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

      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
      const deletionTime = conv ? computeDeletionTime((conv as any).autoDeleteMessagesAfter ?? 24) : null;

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
      this.io.to(`conv:${conversationId}`).emit('receiveMessage', responseMsg);
      this.io.to(conversationId).emit('receiveMessage', responseMsg);
      socket.emit('sendMessageSuccess', { message: responseMsg, conversationId });
    } catch (err: any) {
      logger.error({ err }, 'handleSendEmoji error');
      socket.emit('sendMessageError', { message: err.message || 'Server error', clientTempId });
    }
  }

  // ─── typing ────────────────────────────────────────────────────────────────

  handleTyping(socket: Socket, data: any) {
    const { conversationId, userId, isTyping } = data ?? {};
    if (!conversationId) return;
    const uid = userId || (socket as any).user?.id;
    this.io.to(conversationId).emit('typing', { userId: uid, isTyping });
    this.io.to(conversationId).emit('message:typing', { userId: uid, isTyping });
  }

  // ─── messageRead ───────────────────────────────────────────────────────────

  async handleMessageRead(socket: Socket, data: any) {
    const { conversationId, userId } = data ?? {};
    const uid = userId || (socket as any).user?.id;
    if (!conversationId || !uid) return;

    try {
      // Update message statuses
      await prisma.$executeRaw`
        UPDATE messages
        SET status = 'read'
        WHERE conversationId = ${conversationId}
          AND receiverId = ${uid}
          AND status != 'read'
      `;

      // Insert read receipts (message_read_by created by message-service migration)
      try {
        await prisma.$executeRaw`
          INSERT IGNORE INTO message_read_by (id, messageId, userId, readAt)
          SELECT UUID(), id, ${uid}, NOW()
          FROM messages
          WHERE conversationId = ${conversationId}
            AND receiverId = ${uid}
        `;
      } catch {
        // table might not exist yet; non-critical
      }

      const updatedMessages = await prisma.message.findMany({
        where: { conversationId, receiverId: uid },
        select: { id: true },
      });
      const messageIds = updatedMessages.map((m) => m.id);

      if (messageIds.length > 0) {
        this.io.to(conversationId).emit('messagesRead', { conversationId, userId: uid, messageIds });
        this.io.to(`conv:${conversationId}`).emit('messagesRead', { conversationId, userId: uid, messageIds });
      }
    } catch (err: any) {
      logger.error({ err }, 'handleMessageRead error');
    }
  }

  // ─── messageDelivered ──────────────────────────────────────────────────────

  async handleMessageDelivered(socket: Socket, data: any) {
    const { conversationId, userId } = data ?? {};
    const uid = userId || (socket as any).user?.id;
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
        this.io.to(conversationId).emit('messagesDelivered', { conversationId, userId: uid, messageIds });
        this.io.to(`conv:${conversationId}`).emit('messagesDelivered', { conversationId, userId: uid, messageIds });
      }
    } catch (err: any) {
      logger.error({ err }, 'handleMessageDelivered error');
    }
  }

  // ─── deleteMessage ─────────────────────────────────────────────────────────

  async handleDeleteMessage(socket: Socket, data: any) {
    const { messageId, userId } = data ?? {};
    const uid = userId || (socket as any).user?.id;

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
        // Owner: hard delete
        await prisma.message.delete({ where: { id: messageId } });
        hardDelete = true;
      } else {
        // Non-owner: soft delete via message_deleted_by
        try {
          await prisma.$executeRaw`
            INSERT IGNORE INTO message_deleted_by (id, messageId, userId)
            VALUES (UUID(), ${messageId}, ${uid})
          `;
        } catch {
          // table might not exist yet; non-critical
        }
      }

      this.io.to(convId).emit('messageDeleted', { messageId, userId: uid, hardDelete });
      this.io.to(`conv:${convId}`).emit('messageDeleted', { messageId, userId: uid, hardDelete });
    } catch (err: any) {
      logger.error({ err }, 'handleDeleteMessage error');
      socket.emit('deleteMessageError', { message: err.message || 'Server error' });
    }
  }

  // ─── replyMessage ──────────────────────────────────────────────────────────

  async handleReplyMessage(socket: Socket, data: any) {
    const {
      conversationId,
      messageId,
      text,
      htmlEmoji,
      emojiType,
      clientTempId,
    } = data ?? {};
    const userId = (socket as any).user?.id;

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

      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
      const deletionTime = conv ? computeDeletionTime((conv as any).autoDeleteMessagesAfter ?? 24) : null;

      let finalText: string | null = null;
      let isEncrypted = false;
      if (text) {
        const enc = await handleTextEncryption(text, conversationId);
        finalText = enc.text;
        isEncrypted = enc.isBackendEncrypted;
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          text: finalText,
          htmlEmoji: htmlEmoji || null,
          emojiType: emojiType || null,
          isBackendEncrypted: isEncrypted,
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

      const decryptedText = await tryDecryptText(finalText);
      const responseMsg = formatMessage({ ...message, text: decryptedText }, clientTempId);

      this.io.to(conversationId).emit('replyReceiveMessage', responseMsg);
      this.io.to(conversationId).emit('message:reply', responseMsg);
      this.io.to(`conv:${conversationId}`).emit('replyReceiveMessage', responseMsg);
      this.io.to(`conv:${conversationId}`).emit('message:reply', responseMsg);
      socket.emit('replyMessageSuccess', { message: responseMsg, conversationId, clientTempId });
    } catch (err: any) {
      logger.error({ err }, 'handleReplyMessage error');
      socket.emit('replyMessageError', { message: err.message || 'Server error', clientTempId });
    }
  }

  // ─── editMessage ───────────────────────────────────────────────────────────

  async handleEditMessage(socket: Socket, data: any) {
    const { messageId, text, htmlEmoji, emojiType, clientTempId } = data ?? {};
    const userId = (socket as any).user?.id;

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

      // Store edit history (non-critical, table created by message-service)
      try {
        await prisma.$executeRaw`
          INSERT INTO message_edit_history (id, messageId, oldText, editedAt)
          VALUES (UUID(), ${messageId}, ${existing.text ?? ''}, NOW())
        `;
      } catch {
        // non-critical if table not yet available
      }

      let newText: string | null = existing.text;
      let isEncrypted = existing.isBackendEncrypted;
      if (text !== undefined) {
        const enc = await handleTextEncryption(text, existing.conversationId);
        newText = enc.text;
        isEncrypted = enc.isBackendEncrypted;
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

      const decryptedText = await tryDecryptText(newText);
      const responseMsg = formatMessage({ ...updated, text: decryptedText }, clientTempId);

      const convId = existing.conversationId;
      this.io.to(convId).emit('messageEdited', responseMsg);
      this.io.to(convId).emit('message:edited', responseMsg);
      this.io.to(`conv:${convId}`).emit('messageEdited', responseMsg);
      this.io.to(`conv:${convId}`).emit('message:edited', responseMsg);
      socket.emit('editMessageSuccess', { message: responseMsg, clientTempId });
    } catch (err: any) {
      logger.error({ err }, 'handleEditMessage error');
      socket.emit('editMessageError', { message: err.message || 'Server error', clientTempId });
    }
  }

  // ─── addReaction ───────────────────────────────────────────────────────────

  async handleAddReaction(socket: Socket, data: any) {
    const { messageId, reaction, clientTempId } = data ?? {};
    const userId = (socket as any).user?.id;
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

      await prisma.message.update({
        where: { id: messageId },
        data: { reactions: reactions as any },
      });

      const convId = message.conversationId;
      this.io.to(convId).emit('reactionsUpdated', { messageId, reactions, conversationId: convId });
      this.io.to(`conv:${convId}`).emit('reactionsUpdated', { messageId, reactions, conversationId: convId });
      socket.emit('reactionSuccess', { messageId, reaction, clientTempId });
    } catch (err: any) {
      logger.error({ err }, 'handleAddReaction error');
      socket.emit('reactionError', { message: err.message || 'Server error', clientTempId });
    }
  }

  // ─── removeReaction ────────────────────────────────────────────────────────

  async handleRemoveReaction(socket: Socket, data: any) {
    const { messageId, reaction, clientTempId } = data ?? {};
    const userId = (socket as any).user?.id;

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

      await prisma.message.update({
        where: { id: messageId },
        data: { reactions: reactions as any },
      });

      const convId = message.conversationId;
      this.io.to(convId).emit('reactionsUpdated', { messageId, reactions, conversationId: convId });
      this.io.to(`conv:${convId}`).emit('reactionsUpdated', { messageId, reactions, conversationId: convId });
      socket.emit('unreactionSuccess', { messageId, reaction, clientTempId });
    } catch (err: any) {
      logger.error({ err }, 'handleRemoveReaction error');
      socket.emit('unreactionError', { message: err.message || 'Server error', clientTempId });
    }
  }

  handleDisconnect(_socket: Socket, _reason: string) {
    // no-op; presence handled by UserGateway
  }
}
