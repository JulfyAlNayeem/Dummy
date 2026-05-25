import crypto from 'crypto';
import { getRedisClient } from '../config/redisClient.js';
import logger from '../common/utils/logger.js';

const REDIS_PREFIX = 'smte';
const MAX_KEYS = 2;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const ALGORITHM = 'aes-256-gcm';

function redisKey(conversationId: string): string {
  return `${REDIS_PREFIX}:${conversationId}`;
}

function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

export async function getOrCreateTransportKeys(conversationId: string) {
  const redis = getRedisClient();
  const key = redisKey(conversationId);
  const raw = await redis.hGetAll(key);

  if (!raw || !raw.keys) {
    const firstKey = generateKey();
    await redis.hSet(key, { keys: JSON.stringify([firstKey]), version: '1' });
    logger.info({ conversationId }, 'SMTE: created initial transport key');
    return { keys: [firstKey], version: 1 };
  }

  return { keys: JSON.parse(raw.keys), version: parseInt(raw.version, 10) };
}

export async function rotateTransportKey(conversationId: string) {
  const redis = getRedisClient();
  const key = redisKey(conversationId);
  const raw = await redis.hGetAll(key);

  let keys: string[] = [];
  let version = 0;

  if (raw?.keys) {
    keys = JSON.parse(raw.keys);
    version = parseInt(raw.version, 10);
  }

  const newKey = generateKey();
  keys.unshift(newKey);
  if (keys.length > MAX_KEYS) keys.length = MAX_KEYS;
  version += 1;

  await redis.hSet(key, { keys: JSON.stringify(keys), version: String(version) });
  logger.info({ conversationId, version }, 'SMTE: transport key rotated');
  return { keys, version };
}

export async function rotateAllTransportKeys() {
  const redis = getRedisClient();
  const conversationIds: string[] = [];
  let cursor = '0';

  do {
    const result = await redis.scan(cursor, { MATCH: `${REDIS_PREFIX}:*`, COUNT: 200 });
    cursor = result.cursor.toString();
    for (const k of result.keys) {
      conversationIds.push(k.replace(`${REDIS_PREFIX}:`, ''));
    }
  } while (cursor !== '0');

  let rotated = 0;
  for (const cid of conversationIds) {
    try {
      await rotateTransportKey(cid);
      rotated++;
    } catch (err) {
      logger.error({ conversationId: cid, error: err }, 'SMTE: failed to rotate key');
    }
  }

  return { rotated, total: conversationIds.length };
}

export async function decryptTransportText(encryptedPayload: string, conversationId: string): Promise<string> {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 5 || parts[0] !== 'SMTE') throw new Error('Invalid SMTE text payload format');

  const [, , ivB64, tagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const { keys } = await getOrCreateTransportKeys(conversationId);

  for (const k of keys) {
    try {
      const keyBuf = Buffer.from(k, 'base64');
      const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
      decipher.setAuthTag(authTag);
      let plain = decipher.update(ciphertext);
      plain = Buffer.concat([plain, decipher.final()]);
      return plain.toString('utf8');
    } catch {
      continue;
    }
  }

  throw new Error('SMTE: text decryption failed with all available keys');
}

export async function decryptTransportFile(
  envelope: { iv: string; authTag: string; data: string },
  conversationId: string
): Promise<Buffer> {
  const iv = Buffer.from(envelope.iv, 'base64');
  const authTag = Buffer.from(envelope.authTag, 'base64');
  const ciphertext = Buffer.from(envelope.data, 'base64');
  const { keys } = await getOrCreateTransportKeys(conversationId);

  for (const k of keys) {
    try {
      const keyBuf = Buffer.from(k, 'base64');
      const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
      decipher.setAuthTag(authTag);
      let plain = decipher.update(ciphertext);
      plain = Buffer.concat([plain, decipher.final()]);
      return plain;
    } catch {
      continue;
    }
  }

  throw new Error('SMTE: file decryption failed with all available keys');
}

export function isSMTEEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return text.startsWith('SMTE:') && text.split(':').length === 5;
}
