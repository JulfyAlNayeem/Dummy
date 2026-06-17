/**
 * SMTE - Server-Managed Transport Encryption Service
 * 
 * Provides per-conversation transport encryption keys so that messages
 * (text AND files) are encrypted on the frontend before traversing the
 * network. The server generates, stores, and rotates these keys.
 * 
 * Key storage: Redis hash  smte:{conversationId} -> { keys: JSON([current, previous]), version: N }
 * Key array:  max 2 entries  [currentKey, previousKey]
 * Rotation:   every 24 h via cron (same scheduler that rotates backend storage keys)
 * Algorithm:  AES-256-GCM  (same as backend storage encryption)
 * 
 * File encryption: files are encrypted as binary → base64 chunks on the
 * frontend using the same AES-256-GCM transport key. The backend receives
 * base64-encoded ciphertext, decrypts to recover the original binary, then
 * stores the file on disk (and optionally re-encrypts at rest with the
 * backend storage key).
 */

import crypto from 'crypto';
import { getRedisClient } from '../config/redisClient.js';
import logger from '../src/common/utils/logger.js';

// ── constants ────────────────────────────────────────────────────────────────
const REDIS_PREFIX = 'smte';            // smte:{conversationId}
const MAX_KEYS = 2;                     // [current, previous]
const KEY_LENGTH = 32;                  // 256 bits
const IV_LENGTH = 12;                   // 96 bits – recommended for AES-GCM
const ALGORITHM = 'aes-256-gcm';

// ── helpers ──────────────────────────────────────────────────────────────────

function redisKey(conversationId) {
  return `${REDIS_PREFIX}:${conversationId}`;
}

function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Get (or create on first call) the transport keys for a conversation.
 * Returns { keys: [currentKeyBase64, previousKeyBase64?], version: number }
 */
export async function getOrCreateTransportKeys(conversationId) {
  const redis = getRedisClient();
  const key = redisKey(conversationId);

  let raw = await redis.hGetAll(key);

  if (!raw || !raw.keys) {
    // First time – generate initial key
    const firstKey = generateKey();
    const payload = { keys: JSON.stringify([firstKey]), version: '1' };
    await redis.hSet(key, payload);
    logger.info({ conversationId }, '🔑 SMTE: created initial transport key');
    return { keys: [firstKey], version: 1 };
  }

  const keys = JSON.parse(raw.keys);
  const version = parseInt(raw.version, 10);
  return { keys, version };
}

/**
 * Rotate the transport key for a single conversation.
 * Pushes a new key to index 0, keeps old key at index 1, drops any extra.
 */
export async function rotateTransportKey(conversationId) {
  const redis = getRedisClient();
  const key = redisKey(conversationId);

  const raw = await redis.hGetAll(key);
  let keys = [];
  let version = 0;

  if (raw && raw.keys) {
    keys = JSON.parse(raw.keys);
    version = parseInt(raw.version, 10);
  }

  const newKey = generateKey();
  keys.unshift(newKey);                       // new key at front
  if (keys.length > MAX_KEYS) keys.length = MAX_KEYS; // trim

  version += 1;
  await redis.hSet(key, { keys: JSON.stringify(keys), version: String(version) });

  logger.info({ conversationId, version }, '🔄 SMTE: transport key rotated');
  return { keys, version };
}

/**
 * Rotate transport keys for ALL active conversations.
 * Called by the daily cron job.
 */
export async function rotateAllTransportKeys() {
  const redis = getRedisClient();

  // SCAN for all smte:* keys
  const conversationIds = [];
  let cursor = '0';
  do {
    const result = await redis.scan(cursor, { MATCH: `${REDIS_PREFIX}:*`, COUNT: 200 });
    cursor = result.cursor.toString();
    for (const k of result.keys) {
      conversationIds.push(k.replace(`${REDIS_PREFIX}:`, ''));
    }
  } while (cursor !== '0');

  logger.info({ count: conversationIds.length }, '🔄 SMTE: rotating transport keys for all conversations');

  let rotated = 0;
  for (const cid of conversationIds) {
    try {
      await rotateTransportKey(cid);
      rotated++;
    } catch (err) {
      logger.error({ conversationId: cid, error: err }, '❌ SMTE: failed to rotate key');
    }
  }

  logger.info({ rotated, total: conversationIds.length }, '✅ SMTE: bulk rotation complete');
  return { rotated, total: conversationIds.length };
}

// ── transport-layer encrypt / decrypt (used by the backend to unwrap) ────────

/**
 * Decrypt a transport-encrypted text message.
 * Expected format: SMTE:<version>:<iv_base64>:<authTag_base64>:<ciphertext_base64>
 * 
 * @param {string} encryptedPayload  - the full SMTE:… string
 * @param {string} conversationId    - to look up transport keys
 * @returns {Promise<string>}        - plaintext UTF-8
 */
export async function decryptTransportText(encryptedPayload, conversationId) {
  const parts = encryptedPayload.split(':');
  // SMTE : version : iv : authTag : ciphertext
  if (parts.length !== 5 || parts[0] !== 'SMTE') {
    throw new Error('Invalid SMTE text payload format');
  }

  const [, versionStr, ivB64, tagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const { keys } = await getOrCreateTransportKeys(conversationId);

  // Try each key (current first, then fallback)
  for (let i = 0; i < keys.length; i++) {
    try {
      const keyBuf = Buffer.from(keys[i], 'base64');
      const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
      decipher.setAuthTag(authTag);
      let plain = decipher.update(ciphertext);
      plain = Buffer.concat([plain, decipher.final()]);
      return plain.toString('utf8');
    } catch {
      // try next key
    }
  }

  throw new Error('SMTE: text decryption failed with all available keys');
}

/**
 * Decrypt a transport-encrypted file (binary).
 * The frontend sends each file as a JSON envelope:
 * { smteVersion, iv, authTag, data }          (all base64 strings)
 * 
 * @param {Object} envelope          - { iv, authTag, data } (base64)
 * @param {string} conversationId
 * @returns {Promise<Buffer>}        - raw file bytes
 */
export async function decryptTransportFile(envelope, conversationId) {
  const { iv: ivB64, authTag: tagB64, data: dataB64 } = envelope;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(dataB64, 'base64');

  const { keys } = await getOrCreateTransportKeys(conversationId);

  for (let i = 0; i < keys.length; i++) {
    try {
      const keyBuf = Buffer.from(keys[i], 'base64');
      const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
      decipher.setAuthTag(authTag);
      let plain = decipher.update(ciphertext);
      plain = Buffer.concat([plain, decipher.final()]);
      return plain; // raw Buffer
    } catch {
      // try next key
    }
  }

  throw new Error('SMTE: file decryption failed with all available keys');
}

/**
 * Check whether a string looks like an SMTE-encrypted text payload.
 * Format: SMTE:<version>:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 * We split on exactly 4 colons (5 parts) and verify each component exists.
 */
export function isSMTEEncrypted(text) {
  if (!text || typeof text !== 'string') return false;
  if (!text.startsWith('SMTE:')) return false;
  const parts = text.split(':');
  // Must have exactly 5 parts and all non-empty
  return parts.length === 5 && parts.every(p => p.length > 0);
}

export default {
  getOrCreateTransportKeys,
  rotateTransportKey,
  rotateAllTransportKeys,
  decryptTransportText,
  decryptTransportFile,
  isSMTEEncrypted,
};
