import crypto from 'crypto';
import { getRedisClient } from '../config/redis.js';

const REDIS_KEY_PREFIX = 'backend_encryption_keys';
const KEY_ARRAY_SIZE = 5;
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

export async function initializeEncryptionKeys(): Promise<string[]> {
  const redis = getRedisClient();
  const existing = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);
  if (existing.length > 0) return existing;

  const keys: string[] = Array.from({ length: KEY_ARRAY_SIZE }, generateEncryptionKey);
  await redis.del(REDIS_KEY_PREFIX);
  await redis.rPush(REDIS_KEY_PREFIX, keys);
  return keys;
}

export async function getCurrentEncryptionKey(): Promise<string> {
  const redis = getRedisClient();
  const keys = await redis.lRange(REDIS_KEY_PREFIX, 0, 0);
  if (keys.length === 0) return (await initializeEncryptionKeys())[0];
  return keys[0];
}

export async function getAllEncryptionKeys(): Promise<string[]> {
  const redis = getRedisClient();
  const keys = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);
  if (keys.length === 0) return initializeEncryptionKeys();
  return keys;
}

export async function rotateEncryptionKeys() {
  const redis = getRedisClient();
  const newKey = generateEncryptionKey();
  await redis.lPush(REDIS_KEY_PREFIX, newKey);
  await redis.lTrim(REDIS_KEY_PREFIX, 0, KEY_ARRAY_SIZE - 1);
  return { success: true };
}

export function isBackendEncrypted(text: string): boolean {
  return typeof text === 'string' && text.startsWith('ENC:v1:');
}

export async function encryptMessage(plaintext: string): Promise<string> {
  const keyBase64 = await getCurrentEncryptionKey();
  const key = Buffer.from(keyBase64, 'base64');
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return `ENC:v1:${combined.toString('base64')}`;
}

export async function decryptMessage(ciphertext: string): Promise<string> {
  if (!isBackendEncrypted(ciphertext)) return ciphertext;
  const keys = await getAllEncryptionKeys();
  const data = Buffer.from(ciphertext.replace('ENC:v1:', ''), 'base64');
  // salt(16) + iv(16) + authTag(16) + encrypted
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  for (const keyBase64 of keys) {
    try {
      const key = Buffer.from(keyBase64, 'base64');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(encrypted) + decipher.final('utf8');
    } catch {
      // try next key
    }
  }
  throw new Error('Failed to decrypt message with any key');
}
