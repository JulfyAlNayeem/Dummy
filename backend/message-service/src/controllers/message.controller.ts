import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { encryptMessage, decryptMessage, isBackendEncrypted } from '../services/encryptionService.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatMessage(msg: any): any {
  if (!msg) return msg;
  const out: any = { ...msg, _id: msg.id, conversation: msg.conversationId };
  if (msg.sender && typeof msg.sender === 'object') {
    out.sender = { id: msg.senderId, ...msg.sender, username: msg.sender.name };
  }
  if (Array.isArray(msg.deletedBy)) out.deletedBy = msg.deletedBy.map((d: any) => d.userId ?? d);
  if (Array.isArray(msg.readBy)) out.readBy = msg.readBy.map((r: any) => r.userId ? { user: r.userId, readAt: r.readAt } : r);
  return out;
}

function mimeToMediaType(mime: string) {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

// ─── sendMessage ─────────────────────────────────────────────────────────────

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.conversationId || req.body.conversationId;
    const { text, receiver, clientTempId } = req.body;
    const files: Express.Multer.File[] = (req as any).files || [];

    if (!conversationId && !receiver) {
      res.status(400).json({ message: 'conversationId or receiver required' });
      return;
    }

    // Resolve or create conversation
    let convId = conversationId;
    if (!convId && receiver) {
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: receiver } } },
          ],
        } as any,
      });
      convId = existing?.id;
      if (!convId) {
        const newConv = await prisma.conversation.create({
          data: {
            isGroup: false,
            participants: { create: [{ userId }, { userId: receiver }] },
          } as any,
        });
        convId = newConv.id;
      }
    }

    // Encrypt text if provided (fall back to storing as-is if Redis unavailable)
    let encryptedText: string | null = null;
    let backendEncrypted = false;
    if (text) {
      try {
        encryptedText = await encryptMessage(text);
        backendEncrypted = true;
      } catch {
        encryptedText = text;
        backendEncrypted = false;
      }
    }

    const messageType = files.length > 0 ? (files.length > 1 ? 'mixed' : mimeToMediaType(files[0].mimetype)) : 'text';

    const message = await prisma.message.create({
      data: {
        conversationId: convId,
        senderId: userId,
        receiverId: receiver || null,
        text: encryptedText,
        isBackendEncrypted: backendEncrypted,
        messageType: messageType as any,
        scheduledDeletionTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ...(files.length > 0 && {
          media: {
            create: files.map((f) => ({
              url: `/uploads/${f.filename}`,
              type: mimeToMediaType(f.mimetype) as any,
              filename: f.originalname,
              size: f.size,
            })),
          },
        }),
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        media: true,
        readBy: true,
        deletedBy: true,
      },
    });

    // Emit via socket
    const io = (req as any).app.get('io');
    const formatted = formatMessage(message);
    if (io) {
      io.to(`conv:${convId}`).emit('message:new', formatted);
      // Also notify all participants via their personal rooms
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: convId },
        select: { userId: true },
      });
      for (const { userId: uid } of participants) {
        io.to(`user_${uid}`).emit('conversation_updated', { id: convId, _id: convId });
        io.to(uid).emit('conversation_updated', { id: convId, _id: convId });
        if (uid !== userId) {
          io.to(`user_${uid}`).emit('newMessageNotification', { conversationId: convId, senderId: userId, message: formatted });
          io.to(uid).emit('newMessageNotification', { conversationId: convId, senderId: userId, message: formatted });
        }
      }
    }

    // Update conversation last message
    await (prisma as any).conversation.update({
      where: { id: convId },
      data: {
        lastMessageText: text || (files.length ? '[media]' : ''),
        lastMessageSenderId: userId,
        lastMessageTimestamp: new Date(),
      },
    }).catch(() => {});

    res.status(201).json({ message: formatMessage(message), clientTempId });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// ─── getMessages ─────────────────────────────────────────────────────────────

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(before && { createdAt: { lt: new Date(before) } }),
        deletedBy: { none: { userId } },
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        media: true,
        readBy: true,
        deletedBy: true,
        replyTo: { include: { sender: { select: { id: true, name: true } }, media: true } },
        messageReactions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Decrypt messages
    const decrypted = await Promise.all(
      messages.map(async (m) => {
        const fmt = formatMessage(m);
        if (m.isBackendEncrypted && m.text) {
          try { fmt.text = await decryptMessage(m.text); } catch { fmt.text = '[encrypted]'; }
        }
        return fmt;
      })
    );

    res.json({ messages: decrypted.reverse() });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
};

// ─── editMessage ─────────────────────────────────────────────────────────────

export const editMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) { res.status(404).json({ message: 'Message not found' }); return; }
    if (message.senderId !== userId) { res.status(403).json({ message: 'Forbidden' }); return; }

    await (prisma as any).messageEditHistory.create({
      data: { messageId, oldText: message.text || '' },
    });

    const encryptedText = text ? await encryptMessage(text) : message.text;
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { text: encryptedText, isBackendEncrypted: !!text, edited: true },
      include: { sender: { select: { id: true, name: true } }, media: true },
    });

    const io = (req as any).app.get('io');
    if (io) io.to(`conv:${updated.conversationId}`).emit('message:edited', formatMessage(updated));

    res.json({ message: formatMessage(updated) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to edit message', error: error.message });
  }
};

// ─── deleteMessage ────────────────────────────────────────────────────────────

export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { messageId } = req.params;
    const forEveryone = req.query.forEveryone === 'true';

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) { res.status(404).json({ message: 'Message not found' }); return; }

    if (forEveryone && message.senderId === userId) {
      await prisma.message.delete({ where: { id: messageId } });
      const io = (req as any).app.get('io');
      if (io) io.to(`conv:${message.conversationId}`).emit('message:deleted', { messageId, forEveryone: true });
    } else {
      await (prisma as any).messageDeletedBy.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId },
        update: {},
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete message', error: error.message });
  }
};

// ─── markAsRead ───────────────────────────────────────────────────────────────

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { conversationId } = req.params;

    const unread = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readBy: { none: { userId } },
      },
      select: { id: true },
    });

    if (unread.length > 0) {
      await (prisma as any).messageReadBy.createMany({
        data: unread.map((m) => ({ messageId: m.id, userId })),
        skipDuplicates: true,
      });
    }

    await (prisma as any).conversationUnread.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, count: 0 },
      update: { count: 0 },
    });

    const io = (req as any).app.get('io');
    if (io) io.to(`conv:${conversationId}`).emit('message:read', { conversationId, userId });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to mark as read', error: error.message });
  }
};

// ─── getConversationImages ────────────────────────────────────────────────────

export const getConversationImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const media = await (prisma as any).messageMedia.findMany({
      where: { type: 'image', message: { conversationId } },
      include: { message: { select: { createdAt: true, senderId: true } } },
      orderBy: { message: { createdAt: 'desc' } },
    });
    res.json({ images: media });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch images', error: error.message });
  }
};

// ─── addReaction ─────────────────────────────────────────────────────────────

export const addReaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { messageId } = req.params;
    const { type } = req.body;

    const existing = await (prisma as any).messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });

    if (existing) {
      if (existing.type === type) {
        await (prisma as any).messageReaction.delete({ where: { messageId_userId: { messageId, userId } } });
      } else {
        await (prisma as any).messageReaction.update({ where: { messageId_userId: { messageId, userId } }, data: { type } });
      }
    } else {
      await (prisma as any).messageReaction.create({ data: { messageId, userId, type } });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { messageReactions: true },
    });

    const io = (req as any).app.get('io');
    if (io && message) io.to(`conv:${message.conversationId}`).emit('message:reaction', { messageId, reactions: message.messageReactions });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add reaction', error: error.message });
  }
};

// ─── sendEmoji ────────────────────────────────────────────────────────────────

export const sendEmoji = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.conversationId || req.body.conversationId;
    const { text, htmlEmoji, emojiType, receiver, clientTempId } = req.body;

    if (!conversationId && !receiver) {
      res.status(400).json({ message: 'conversationId or receiver required' });
      return;
    }

    let convId = conversationId;
    if (!convId && receiver) {
      const existing = await prisma.conversation.findFirst({
        where: { isGroup: false, AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: receiver } } }] },
      } as any);
      convId = existing?.id;
      if (!convId) {
        const newConv = await prisma.conversation.create({ data: { isGroup: false, participants: { create: [{ userId }, { userId: receiver }] } } } as any);
        convId = newConv.id;
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: convId,
        senderId: userId,
        receiverId: receiver || null,
        text: text || null,
        htmlEmoji: htmlEmoji || null,
        emojiType: emojiType || null,
        isBackendEncrypted: false,
        messageType: 'text',
        scheduledDeletionTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } as any,
      include: { sender: { select: { id: true, name: true, image: true } }, media: true },
    });

    const io = (req as any).app.get('io');
    const formatted = formatMessage(message);
    if (io) {
      io.to(`conv:${convId}`).emit('receiveMessage', formatted);
      const participants = await prisma.conversationParticipant.findMany({ where: { conversationId: convId }, select: { userId: true } });
      for (const { userId: uid } of participants) {
        io.to(`user_${uid}`).emit('conversation_updated', { id: convId, _id: convId });
        if (uid !== userId) {
          io.to(`user_${uid}`).emit('newMessageNotification', { conversationId: convId, senderId: userId, message: formatted });
        }
      }
    }

    res.status(201).json({ message: formatted, clientTempId });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to send emoji', error: error.message });
  }
};

// ─── replyMessage ─────────────────────────────────────────────────────────────

export const replyMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { conversationId, messageId } = req.params;
    const { text, clientTempId } = req.body;
    const files: Express.Multer.File[] = (req as any).files || [];

    const original = await prisma.message.findUnique({ where: { id: messageId } });
    if (!original) { res.status(404).json({ message: 'Original message not found' }); return; }

    let encryptedText: string | null = null;
    let backendEncrypted = false;
    if (text) {
      try {
        encryptedText = await encryptMessage(text);
        backendEncrypted = true;
      } catch {
        encryptedText = text;
      }
    }

    const messageType = files.length > 0 ? (files.length > 1 ? 'mixed' : mimeToMediaType(files[0].mimetype)) : 'text';
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        text: encryptedText,
        isBackendEncrypted: backendEncrypted,
        messageType: messageType as any,
        replyToId: messageId,
        scheduledDeletionTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ...(files.length > 0 && {
          media: { create: files.map((f) => ({ url: `/uploads/${f.filename}`, type: mimeToMediaType(f.mimetype) as any, filename: f.originalname, size: f.size })) },
        }),
      } as any,
      include: { sender: { select: { id: true, name: true, image: true } }, media: true, replyTo: { include: { sender: { select: { id: true, name: true } }, media: true } } },
    });

    const io = (req as any).app.get('io');
    const formatted = formatMessage(message);
    if (io) {
      io.to(`conv:${conversationId}`).emit('receiveMessage', formatted);
      const participants = await prisma.conversationParticipant.findMany({ where: { conversationId }, select: { userId: true } });
      for (const { userId: uid } of participants) {
        io.to(`user_${uid}`).emit('conversation_updated', { id: conversationId, _id: conversationId });
        if (uid !== userId) io.to(`user_${uid}`).emit('newMessageNotification', { conversationId, senderId: userId, message: formatted });
      }
    }

    res.status(201).json({ message: formatted, clientTempId });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to send reply', error: error.message });
  }
};
