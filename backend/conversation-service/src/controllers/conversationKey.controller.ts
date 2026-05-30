import type { Request, Response } from 'express';
import prisma from '../config/database.js';

interface KeyData {
  publicKey: string;
  keyId: string;
  keyVersion: number;
  exchangedAt: string;
  isActive: boolean;
}

type KeyExchangeParticipants = Record<string, KeyData>;

type V1Payload = {
  participants?: KeyExchangeParticipants;
  [key: string]: unknown;
};

type StorageMode = 'v1' | 'legacy';

let storageModePromise: Promise<StorageMode> | null = null;

function parseJsonValue(value: unknown): any {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value;
  return {};
}

async function getStorageMode(): Promise<StorageMode> {
  if (!storageModePromise) {
    storageModePromise = (async () => {
      const cols = await prisma.$queryRaw<Array<{ COLUMN_NAME?: string; column_name?: string }>>`
        SELECT COLUMN_NAME
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'conversations'
          AND LOWER(column_name) IN ('v1_keys', 'smte_key_version', 'key_exchange_data')
      `;

      const names = new Set(
        cols
          .map((c) => String(c.COLUMN_NAME ?? c.column_name ?? '').toLowerCase())
          .filter(Boolean)
      );
      if (names.has('v1_keys')) return 'v1';
      if (names.has('key_exchange_data')) return 'legacy';
      throw new Error('No key storage columns found on conversations table');
    })();
  }

  return storageModePromise;
}

async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ ok: number }>>`
    SELECT 1 AS ok
    FROM conversation_participants
    WHERE conversationId = ${conversationId} AND userId = ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function getParticipantCount(conversationId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
    SELECT COUNT(*) AS total
    FROM conversation_participants
    WHERE conversationId = ${conversationId}
  `;
  const total = rows[0]?.total ?? 0;
  return Number(total);
}

async function loadConversationState(conversationId: string): Promise<{
  mode: StorageMode;
  exists: boolean;
  participants: KeyExchangeParticipants;
  v1Payload: V1Payload;
  currentVersion: number;
}> {
  const mode = await getStorageMode();

  if (mode === 'v1') {
    const rows = await prisma.$queryRaw<Array<{ id: string; v1Keys: unknown; smteKeyVersion: number | null }>>`
      SELECT id, v1_keys AS v1Keys, smte_key_version AS smteKeyVersion
      FROM conversations
      WHERE id = ${conversationId}
      LIMIT 1
    `;

    if (!rows.length) {
      return { mode, exists: false, participants: {}, v1Payload: {}, currentVersion: 0 };
    }

    const rawPayload = parseJsonValue(rows[0].v1Keys) as V1Payload;
    const participants =
      rawPayload.participants && typeof rawPayload.participants === 'object'
        ? (rawPayload.participants as KeyExchangeParticipants)
        : {};

    return {
      mode,
      exists: true,
      participants,
      v1Payload: rawPayload,
      currentVersion: Number(rows[0].smteKeyVersion ?? 0),
    };
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; keyExchangeData: unknown }>>`
    SELECT id, key_exchange_data AS keyExchangeData
    FROM conversations
    WHERE id = ${conversationId}
    LIMIT 1
  `;

  if (!rows.length) {
    return { mode, exists: false, participants: {}, v1Payload: {}, currentVersion: 0 };
  }

  return {
    mode,
    exists: true,
    participants: parseJsonValue(rows[0].keyExchangeData) as KeyExchangeParticipants,
    v1Payload: {},
    currentVersion: 0,
  };
}

async function saveConversationState(
  conversationId: string,
  mode: StorageMode,
  participants: KeyExchangeParticipants,
  v1Payload: V1Payload,
  version: number,
  totalParticipants: number
): Promise<void> {
  const exchangedCount = Object.keys(participants).length;
  const status = exchangedCount >= totalParticipants ? 'complete' : 'partial';

  if (mode === 'v1') {
    const payload: V1Payload = {
      ...v1Payload,
      participants,
    };

    await prisma.$executeRaw`
      UPDATE conversations
      SET v1_keys = ${JSON.stringify(payload)},
          smte_key_version = ${version}
      WHERE id = ${conversationId}
    `;
    return;
  }

  await prisma.$executeRaw`
    UPDATE conversations
    SET key_exchange_data = ${JSON.stringify(participants)},
        key_exchange_status = ${status},
        key_exchange_created_at = COALESCE(key_exchange_created_at, NOW()),
        key_exchange_last_activity = NOW()
    WHERE id = ${conversationId}
  `;
}

export const exchangeConversationKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id as string;
    const conversationId = req.params.conversationId as string;
    const { publicKey } = req.body as { publicKey?: string };

    if (!publicKey) {
      res.status(400).json({ message: 'Public key is required.' });
      return;
    }

    const participantExists = await isParticipant(conversationId, userId);
    if (!participantExists) {
      res.status(403).json({ message: 'You are not a participant of this conversation.' });
      return;
    }

    const state = await loadConversationState(conversationId);
    if (!state.exists) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    const participants = state.participants;
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

    const totalParticipants = await getParticipantCount(conversationId);
    const exchangedCount = Object.keys(participants).length;

    await saveConversationState(
      conversationId,
      state.mode,
      participants,
      state.v1Payload,
      Math.max(state.currentVersion, keyVersion),
      totalParticipants
    );

    res.status(200).json({
      success: true,
      message: 'Public key exchanged successfully',
      data: {
        conversationId,
        keyId,
        keyVersion,
        exchangeStatus: exchangedCount >= totalParticipants ? 'complete' : 'partial',
        participantsWithKeys: exchangedCount,
        totalParticipants,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to exchange key.', error: error.message });
  }
};

export const getParticipantKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = (req as any).user.id as string;
    const { conversationId, userId: targetUserId } = req.params as { conversationId: string; userId: string };

    const currentParticipantExists = await isParticipant(conversationId, currentUserId);
    if (!currentParticipantExists) {
      res.status(403).json({ message: 'You are not a participant of this conversation.' });
      return;
    }

    const targetParticipantExists = await isParticipant(conversationId, targetUserId);
    if (!targetParticipantExists) {
      res.status(404).json({ message: 'Target user is not a participant of this conversation.' });
      return;
    }

    const state = await loadConversationState(conversationId);
    if (!state.exists) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    const keyData = state.participants[targetUserId];

    if (!keyData) {
      res.status(404).json({ message: 'No key found for the target user.' });
      return;
    }

    const userRows = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM users WHERE id = ${targetUserId} LIMIT 1
    `;

    res.status(200).json({
      success: true,
      message: 'Participant key retrieved successfully',
      data: {
        conversationId,
        userId: targetUserId,
        userName: userRows[0]?.name || 'Unknown',
        publicKey: keyData.publicKey,
        keyId: keyData.keyId,
        keyVersion: keyData.keyVersion,
        exchangedAt: keyData.exchangedAt,
        isActive: keyData.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get participant key.', error: error.message });
  }
};

export const getConversationKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id as string;
    const conversationId = req.params.conversationId as string;

    const participantExists = await isParticipant(conversationId, userId);
    if (!participantExists) {
      res.status(403).json({ message: 'You are not a participant of this conversation.' });
      return;
    }

    const state = await loadConversationState(conversationId);
    if (!state.exists) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    const participants = state.participants;

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

    const totalParticipants = await getParticipantCount(conversationId);

    res.status(200).json({
      success: true,
      message: 'Conversation keys retrieved successfully',
      data: {
        conversationId,
        exchangeStatus: participantsWithKeys >= totalParticipants ? 'complete' : 'partial',
        totalParticipants,
        participantsWithKeys,
        keys,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get conversation keys.', error: error.message });
  }
};

export const rotateConversationKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id as string;
    const conversationId = req.params.conversationId as string;
    const { newPublicKey } = req.body as { newPublicKey?: string };

    if (!newPublicKey) {
      res.status(400).json({ message: 'New public key is required.' });
      return;
    }

    const participantExists = await isParticipant(conversationId, userId);
    if (!participantExists) {
      res.status(403).json({ message: 'You are not a participant of this conversation.' });
      return;
    }

    const state = await loadConversationState(conversationId);
    if (!state.exists) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }

    const participants = state.participants;
    const existingKey = participants[userId];

    if (!existingKey) {
      res.status(404).json({ message: 'No existing key found. Use key-exchange first.' });
      return;
    }

    const newVersion = existingKey.keyVersion + 1;
    const newKeyId = `${conversationId}-${userId}-v${newVersion}`;

    participants[userId] = {
      ...existingKey,
      publicKey: newPublicKey,
      keyId: newKeyId,
      keyVersion: newVersion,
      exchangedAt: new Date().toISOString(),
      isActive: true,
    };

    const totalParticipants = await getParticipantCount(conversationId);

    await saveConversationState(
      conversationId,
      state.mode,
      participants,
      state.v1Payload,
      Math.max(state.currentVersion, newVersion),
      totalParticipants
    );

    res.status(200).json({
      success: true,
      message: 'Conversation key rotated successfully',
      data: {
        conversationId,
        keyId: newKeyId,
        keyVersion: newVersion,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to rotate key.', error: error.message });
  }
};
