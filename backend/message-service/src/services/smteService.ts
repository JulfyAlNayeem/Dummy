import crypto from 'crypto';
import pino from 'pino';
import { getRedisClient } from '../config/redis.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

const REDIS_PREFIX = 'smte';
const MAX_KEYS = 2;
const KEY_LENGTH = 32;
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
    await redis.hSet(key, 'keys', JSON.stringify([firstKey]), 'version', '1');
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

  await redis.hSet(key, 'keys', JSON.stringify(keys), 'version', String(version));
  logger.info({ conversationId, version }, 'SMTE: transport key rotated');
  return { keys, version };
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

export function isSMTEEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return text.startsWith('SMTE:') && text.split(':').length === 5;
}
