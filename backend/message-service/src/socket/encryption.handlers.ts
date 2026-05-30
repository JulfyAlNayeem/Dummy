import type { Server, Socket } from 'socket.io';
import pino from 'pino';
import prisma from '../config/database.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

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

function getParticipants(v1Keys: unknown): { payload: V1Payload; participants: KeyExchangeParticipants } {
  const payload = (v1Keys && typeof v1Keys === 'object' ? (v1Keys as V1Payload) : {}) as V1Payload;
  const participants =
    payload.participants && typeof payload.participants === 'object'
      ? (payload.participants as KeyExchangeParticipants)
      : {};
  return { payload, participants };
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

    const parsed = parseJsonValue(rows[0].v1Keys);
    const payload = (parsed && typeof parsed === 'object' ? parsed : {}) as V1Payload;
    const participants =
      payload.participants && typeof payload.participants === 'object'
        ? (payload.participants as KeyExchangeParticipants)
        : {};

    return {
      mode,
      exists: true,
      participants,
      v1Payload: payload,
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

async function ensureParticipant(conversationId: string, userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ ok: number }>>`
    SELECT 1 AS ok
    FROM conversation_participants
    WHERE conversationId = ${conversationId} AND userId = ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export function registerEncryptionHandlers(io: Server, socket: Socket): void {
  const runExchange = async (
    { conversationId, publicKey }: { conversationId: string; publicKey: string },
    callback?: Function
  ) => {
    try {
      const userId = String((socket as any).user?.id || '');
      if (!userId) throw new Error('Unauthenticated socket');

      if (!conversationId || conversationId === 'empty') {
        callback?.({ success: false, message: 'Invalid conversation ID' });
        return;
      }

      if (!publicKey || typeof publicKey !== 'string') {
        callback?.({ success: false, message: 'Public key is required and must be a string' });
        return;
      }

      const isParticipant = await ensureParticipant(conversationId, userId);
      if (!isParticipant) {
        callback?.({ success: false, message: 'You are not a participant of this conversation' });
        return;
      }

      const state = await loadConversationState(conversationId);
      if (!state.exists) {
        callback?.({ success: false, message: 'Conversation not found' });
        return;
      }

      const participants = state.participants;
      const existingKey = participants[userId];
      const keyVersion = existingKey ? existingKey.keyVersion + 1 : 1;
      const keyId = `key_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      participants[userId] = {
        publicKey,
        keyId,
        keyVersion,
        exchangedAt: new Date().toISOString(),
        isActive: true,
      };

      const totalParticipants = await getParticipantCount(conversationId);
      const exchangedCount = Object.keys(participants).length;
      const status = exchangedCount >= totalParticipants ? 'complete' : 'partial';

      await saveConversationState(
        conversationId,
        state.mode,
        participants,
        state.v1Payload,
        Math.max(state.currentVersion, keyVersion),
        totalParticipants
      );

      socket.to(conversationId).emit('encryption:key-exchanged', {
        conversationId,
        userId,
        publicKey,
        keyId,
        keyVersion,
      });
      socket.to(`conv:${conversationId}`).emit('encryption:key-exchanged', {
        conversationId,
        userId,
        publicKey,
        keyId,
        keyVersion,
      });

      callback?.({
        success: true,
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
      logger.error({ error: error.message }, 'Exchange key error');
      callback?.({ success: false, error: error.message });
    }
  };

  socket.on('encryption:exchange-key', (data: any, cb?: any) => runExchange(data, cb));
  socket.on('encryption:regenerate-key', (data: any, cb?: any) => runExchange(data, cb));
  socket.on('encryption:key-regenerated', (data: any, cb?: any) => runExchange(data, cb));

  socket.on('encryption:fetch-keys', async ({ conversationId }: { conversationId: string }, callback?: Function) => {
    try {
      const userId = String((socket as any).user?.id || '');
      if (!userId) throw new Error('Unauthenticated socket');

      if (!conversationId || conversationId === 'empty') {
        callback?.({ success: true, data: { keys: [] } });
        return;
      }

      const state = await loadConversationState(conversationId);
      if (!state.exists) {
        callback?.({ success: false, message: 'Conversation not found' });
        return;
      }

      const isParticipant = await ensureParticipant(conversationId, userId);
      if (!isParticipant) {
        callback?.({ success: false, message: 'You are not a participant of this conversation' });
        return;
      }

      const participants = state.participants;
      const totalParticipants = await getParticipantCount(conversationId);

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

      callback?.({
        success: true,
        data: {
          conversationId,
          exchangeStatus: keys.length >= Math.max(totalParticipants - 1, 0) ? 'complete' : 'partial',
          keys,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Fetch keys error');
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('encryption:verify-key', async ({ conversationId }: { conversationId: string }, callback?: Function) => {
    try {
      const userId = String((socket as any).user?.id || '');
      if (!userId) throw new Error('Unauthenticated socket');

      if (!conversationId || conversationId === 'empty') {
        callback?.({ success: true, verified: false, message: 'No active conversation' });
        return;
      }

      const state = await loadConversationState(conversationId);
      if (!state.exists) {
        callback?.({ success: false, verified: false, message: 'Conversation not found' });
        return;
      }

      const participants = state.participants;
      const keyData = participants[userId];
      const verified = !!keyData?.publicKey;

      callback?.({
        success: true,
        verified,
        keyInfo: verified
          ? {
              keyId: keyData.keyId,
              keyVersion: keyData.keyVersion,
              exchangedAt: keyData.exchangedAt,
            }
          : null,
        message: verified ? 'Key verified' : 'No key found for this user in this conversation',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Verify key error');
      callback?.({ success: false, verified: false, error: error.message });
    }
  });

  socket.on(
    'encryption:key-generated',
    ({ conversationId, publicKey, keyId, keyVersion }: { conversationId: string; publicKey: string; keyId: string; keyVersion: number }) => {
      const userId = (socket as any).user?.id;

      socket.to(conversationId).emit('encryption:key-updated', {
        conversationId,
        userId,
        publicKey,
        keyId,
        keyVersion,
      });
      socket.to(`conv:${conversationId}`).emit('encryption:key-updated', {
        conversationId,
        userId,
        publicKey,
        keyId,
        keyVersion,
      });
    }
  );
}
