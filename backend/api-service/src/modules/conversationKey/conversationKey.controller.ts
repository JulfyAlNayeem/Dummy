import { Request, Response } from 'express';
import prisma from '../../config/database.js';

interface KeyData {
  publicKey: string;
  keyId: string;
  keyVersion: number;
  exchangedAt: string;
  isActive: boolean;
}

type KeyExchangeParticipants = Record<string, KeyData>;

export const exchangeConversationKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const conversationId = req.params.conversationId as string;
    const { publicKey } = req.body;

    if (!publicKey) {
      res.status(400).json({ message: 'Public key is required.' });
      return;
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
      res.status(403).json({ message: 'You are not a participant of this conversation.' });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    const participants: KeyExchangeParticipants =
      (conversation.keyExchangeData as unknown as KeyExchangeParticipants) || {};

    const existingKey = participants[userId];
    const keyVersion = existingKey ? existingKey.keyVersion + 1 : 1;
    const keyId = `${conversationId}-${userId}-v${keyVersion}`;

    participants[userId] = {
      publicKey,
      keyId,
      keyVersion,
      exchangedAt: new Date().toISOString(),
      isActive: true,
    };

    const totalParticipants = conversation.participants.length;
    const exchangedCount = Object.keys(participants).length;
    const status = exchangedCount >= totalParticipants ? 'complete' : 'partial';

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        keyExchangeData: participants as any,
        keyExchangeStatus: status,
        keyExchangeCreatedAt: conversation.keyExchangeCreatedAt || new Date(),
        keyExchangeLastActivity: new Date(),
      },
    });

    const io = (req as any).io;
    if (io) {
      io.to(conversationId).emit('key-exchange-update', {
        conversationId,
        userId,
        status,
        keyId,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Public key exchanged successfully',
      data: {
        conversationId,
        keyId,
        keyVersion,
        exchangeStatus: status,
        participantsWithKeys: exchangedCount,
        totalParticipants,
      },
    });
  } catch (error: any) {
    console.error('Exchange conversation key error:', error);
    res.status(500).json({ message: 'Failed to exchange key.', error: error.message });
  }
};

export const getParticipantKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = (req as any).user.id;
    const { conversationId, userId: targetUserId } = req.params as { conversationId: string; userId: string };

    const currentParticipant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: currentUserId } },
    });

    if (!currentParticipant) {
      res.status(403).json({ message: 'You are not a participant of this conversation.' });
      return;
    }

    const targetParticipant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });

    if (!targetParticipant) {
      res.status(404).json({ message: 'Target user is not a participant of this conversation.' });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    const participants: KeyExchangeParticipants =
      (conversation.keyExchangeData as unknown as KeyExchangeParticipants) || {};

    const keyData = participants[targetUserId];

    if (!keyData) {
      res.status(404).json({ message: 'No key found for the target user.' });
      return;
    }

    // Get user name
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true },
    });

    res.status(200).json({
      success: true,
      message: 'Participant key retrieved successfully',
      data: {
        conversationId,
        userId: targetUserId,
        userName: targetUser?.name || 'Unknown',
        publicKey: keyData.publicKey,
        keyId: keyData.keyId,
        keyVersion: keyData.keyVersion,
        exchangedAt: keyData.exchangedAt,
        isActive: keyData.isActive,
      },
    });
  } catch (error: any) {
    console.error('Get participant key error:', error);
    res.status(500).json({ message: 'Failed to get participant key.', error: error.message });
  }
};

export const getConversationKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const conversationId = req.params.conversationId as string;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
      res.status(403).json({ message: 'You are not a participant of this conversation.' });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    const participants: KeyExchangeParticipants =
      (conversation.keyExchangeData as unknown as KeyExchangeParticipants) || {};

    // Return all keys except the current user's
    const keys = Object.entries(participants)
      .filter(([uid]) => uid !== userId)
      .map(([uid, keyData]) => ({
        userId: uid,
        publicKey: keyData.publicKey,
        keyId: keyData.keyId,
        keyVersion: keyData.keyVersion,
        exchangedAt: keyData.exchangedAt,
        isActive: keyData.isActive,
      }));

    const participantsWithKeys = Object.keys(participants).length;

    res.status(200).json({
      success: true,
      message: 'Conversation keys retrieved successfully',
      data: {
        conversationId,
        exchangeStatus: conversation.keyExchangeStatus,
        totalParticipants: conversation.participants.length,
        participantsWithKeys,
        keys,
        createdAt: conversation.keyExchangeCreatedAt,
        lastActivity: conversation.keyExchangeLastActivity,
      },
    });
  } catch (error: any) {
    console.error('Get conversation keys error:', error);
    res.status(500).json({ message: 'Failed to get conversation keys.', error: error.message });
  }
};

export const rotateConversationKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const conversationId = req.params.conversationId as string;
    const { newPublicKey } = req.body;

    if (!newPublicKey) {
      res.status(400).json({ message: 'New public key is required.' });
      return;
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
      res.status(403).json({ message: 'You are not a participant of this conversation.' });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    const participants: KeyExchangeParticipants =
      (conversation.keyExchangeData as unknown as KeyExchangeParticipants) || {};

    const existingKey = participants[userId];
    const newVersion = existingKey ? existingKey.keyVersion + 1 : 1;
    const keyId = `${conversationId}-${userId}-v${newVersion}`;

    participants[userId] = {
      publicKey: newPublicKey,
      keyId,
      keyVersion: newVersion,
      exchangedAt: new Date().toISOString(),
      isActive: true,
    };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        keyExchangeData: participants as any,
        keyExchangeLastActivity: new Date(),
      },
    });

    const io = (req as any).io;
    if (io) {
      io.to(conversationId).emit('key-rotated', {
        conversationId,
        userId,
        keyId,
        keyVersion: newVersion,
      });
    }

    const totalParticipants = await prisma.conversationParticipant.count({
      where: { conversationId },
    });
    const exchangedCount = Object.keys(participants).length;
    const status = exchangedCount >= totalParticipants ? 'complete' : 'partial';

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { keyExchangeStatus: status },
    });

    res.status(200).json({
      success: true,
      message: 'Conversation key rotated successfully',
      data: {
        conversationId,
        newKeyId: keyId,
        newKeyVersion: newVersion,
        rotatedAt: new Date().toISOString(),
        exchangeStatus: status,
      },
    });
  } catch (error: any) {
    console.error('Rotate conversation key error:', error);
    res.status(500).json({ message: 'Failed to rotate key.', error: error.message });
  }
};
