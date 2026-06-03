/**
 * Backend Server-Side Encryption Service
 * Uses rotating encryption keys stored in Redis
 * 5 keys are maintained, rotated daily at midnight
 * Decryption attempts all 5 keys for backward compatibility
 */

import crypto from 'crypto';
import { getRedisClient } from '../config/redisClient.js';
import logger from '../src/common/utils/logger.js';

const REDIS_KEY_PREFIX = 'backend_encryption_keys';
const REDIS_CURRENT_KEY_INDEX = 'backend_encryption_current_index';
const KEY_ARRAY_SIZE = 5;
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

/**
 * Generate a new cryptographically secure encryption key
 * @returns {string} - Base64 encoded key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Initialize encryption keys in Redis if not present
 * Creates 5 keys with the current (newest) at index 0
 */
export async function initializeEncryptionKeys() {
  try {
    const redis = getRedisClient();
    
    // Check if keys already exist
    const existingKeys = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);
    
    if (existingKeys.length === 0) {
      logger.info('🔐 Initializing backend encryption keys...');
      
      // Generate 5 initial keys
      const keys = [];
      for (let i = 0; i < KEY_ARRAY_SIZE; i++) {
        keys.push(generateEncryptionKey());
      }
      
      // Store in Redis (index 0 is the current/newest key)
      await redis.del(REDIS_KEY_PREFIX); // Clear any partial data
      await redis.rPush(REDIS_KEY_PREFIX, keys);
      await redis.set(REDIS_CURRENT_KEY_INDEX, '0');
      
      logger.info({ keyCount: keys.length }, '✅ Backend encryption keys initialized');
      return keys;
    } else {
      logger.info({ keyCount: existingKeys.length }, '🔐 Backend encryption keys already exist');
      return existingKeys;
    }
  } catch (error) {
    logger.error({ error }, '❌ Failed to initialize encryption keys');
    throw error;
  }
}

/**
 * Get current encryption key (index 0)
 * @returns {Promise<string>} - Base64 encoded key
 */
export async function getCurrentEncryptionKey() {
  try {
    const redis = getRedisClient();
    const keys = await redis.lRange(REDIS_KEY_PREFIX, 0, 0);
    
    if (keys.length === 0) {
      logger.warn('⚠️ No encryption keys found, initializing...');
      const newKeys = await initializeEncryptionKeys();
      return newKeys[0];
    }
    
    return keys[0];
  } catch (error) {
    logger.error({ error }, '❌ Failed to get current encryption key');
    throw error;
  }
}

/**
 * Get all encryption keys for decryption fallback
 * @returns {Promise<string[]>} - Array of base64 encoded keys (newest first)
 */
export async function getAllEncryptionKeys() {
  try {
    const redis = getRedisClient();
    const keys = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);
    
    if (keys.length === 0) {
      logger.warn('⚠️ No encryption keys found, initializing...');
      return await initializeEncryptionKeys();
    }
    
    return keys;
  } catch (error) {
    logger.error({ error }, '❌ Failed to get all encryption keys');
    throw error;
  }
}

/**
 * Rotate encryption keys - add new key at index 0, remove oldest
 * Called daily at midnight via cron job
 * @returns {Promise<Object>} - Rotation result
 */
export async function rotateEncryptionKeys() {
  try {
    const redis = getRedisClient();
    
    // Generate new key
    const newKey = generateEncryptionKey();
    
    // Get current keys
    const currentKeys = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);
    
    // Add new key at the beginning (left push)
    await redis.lPush(REDIS_KEY_PREFIX, newKey);
    
    // Keep only the 5 most recent keys (remove oldest if > 5)
    await redis.lTrim(REDIS_KEY_PREFIX, 0, KEY_ARRAY_SIZE - 1);
    
    // Get updated keys
    const updatedKeys = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);
    
    logger.info({
      previousKeyCount: currentKeys.length,
      newKeyCount: updatedKeys.length,
      rotatedAt: new Date().toISOString()
    }, '🔄 Encryption keys rotated successfully');
    
    return {
      success: true,
      previousKeyCount: currentKeys.length,
      newKeyCount: updatedKeys.length,
      rotatedAt: new Date()
    };
  } catch (error) {
    logger.error({ error }, '❌ Failed to rotate encryption keys');
    throw error;
  }
}

/**
 * Encrypt message text with current key
 * @param {string} plaintext - Message text to encrypt
 * @returns {Promise<string>} - Base64 encoded encrypted data (format: salt:iv:authTag:ciphertext)
 */
export async function encryptMessage(plaintext) {
  try {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Invalid plaintext for encryption');
    }
    
    // Get current encryption key
    const keyBase64 = await getCurrentEncryptionKey();
    const key = Buffer.from(keyBase64, 'base64');
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: salt:iv:authTag:ciphertext
    const result = `${salt.toString('base64')}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    
    return result;
  } catch (error) {
    logger.error({ error, message: error.message }, '❌ Encryption failed');
    throw error;
  }
}

/**
 * Decrypt message text - tries all keys from newest to oldest
 * @param {string} encryptedData - Encrypted data (format: salt:iv:authTag:ciphertext)
 * @returns {Promise<string>} - Decrypted plaintext
 */
export async function decryptMessage(encryptedData) {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data for decryption');
    }
    
    // Parse encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltBase64, ivBase64, authTagBase64, ciphertext] = parts;
    const salt = Buffer.from(saltBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Get all keys for fallback decryption
    const keys = await getAllEncryptionKeys();
    
    let lastError = null;
    
    // Try each key from newest to oldest
    for (let i = 0; i < keys.length; i++) {
      try {
        const key = Buffer.from(keys[i], 'base64');
        
        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt
        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        logger.info({ keyIndex: i, totalKeys: keys.length }, '✅ Decryption successful with key');
        return decrypted;
      } catch (error) {
        lastError = error;
        logger.warn({ keyIndex: i, error: error.message }, '⚠️ Decryption failed with key, trying next...');
        continue;
      }
    }
    
    // If all keys failed
    logger.error({ 
      error: lastError,
      keysAttempted: keys.length 
    }, '❌ Decryption failed with all keys');
    
    throw new Error('Failed to decrypt message with any available key');
  } catch (error) {
    logger.error({ error, message: error.message }, '❌ Decryption failed');
    throw error;
  }
}

/**
 * Check if text is backend encrypted (has our format)
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export function isBackendEncrypted(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Check format: salt:iv:authTag:ciphertext (4 parts, base64)
  const parts = text.split(':');
  if (parts.length !== 4) {
    return false;
  }
  
  // Check if all parts are valid base64
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  return parts.every(part => base64Pattern.test(part) && part.length > 0);
}

/**
 * Get encryption keys statistics
 * @returns {Promise<Object>} - Statistics
 */
export async function getEncryptionStats() {
  try {
    const redis = getRedisClient();
    const keys = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);
    const currentIndex = await redis.get(REDIS_CURRENT_KEY_INDEX);
    
    return {
      totalKeys: keys.length,
      currentKeyIndex: parseInt(currentIndex || '0'),
      maxKeys: KEY_ARRAY_SIZE,
      algorithm: ALGORITHM,
      keyLength: KEY_LENGTH * 8, // bits
      keysInitialized: keys.length > 0
    };
  } catch (error) {
    logger.error({ error }, '❌ Failed to get encryption stats');
    return {
      totalKeys: 0,
      currentKeyIndex: 0,
      maxKeys: KEY_ARRAY_SIZE,
      error: error.message
    };
  }
}

// ── Binary file encryption (at-rest) ─────────────────────────────────────────
// Format: BENC (4 bytes magic) + salt (16) + iv (16) + authTag (16) + ciphertext
const FILE_MAGIC = Buffer.from('BENC'); // 4 bytes

/**
 * Encrypt a binary buffer for at-rest file storage.
 * @param {Buffer} plainBuffer - raw file bytes
 * @returns {Promise<Buffer>} - encrypted buffer with BENC header
 */
export async function encryptBuffer(plainBuffer) {
  if (!Buffer.isBuffer(plainBuffer)) {
    throw new Error('encryptBuffer: expected a Buffer');
  }

  const keyBase64 = await getCurrentEncryptionKey();
  const key = Buffer.from(keyBase64, 'base64');
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  // BENC + salt + iv + authTag + ciphertext
  return Buffer.concat([FILE_MAGIC, salt, iv, authTag, encrypted]);
}

/**
 * Decrypt a BENC-encrypted buffer.
 * Tries all rotating keys for backward compatibility.
 * @param {Buffer} encryptedBuffer - buffer starting with BENC header
 * @returns {Promise<Buffer>} - decrypted raw file bytes
 */
export async function decryptBuffer(encryptedBuffer) {
  if (!Buffer.isBuffer(encryptedBuffer) || encryptedBuffer.length < 52) {
    throw new Error('decryptBuffer: invalid or too-short buffer');
  }

  // Verify magic header
  const magic = encryptedBuffer.subarray(0, 4);
  if (!magic.equals(FILE_MAGIC)) {
    throw new Error('decryptBuffer: missing BENC magic header');
  }

  const salt = encryptedBuffer.subarray(4, 4 + SALT_LENGTH);
  const iv = encryptedBuffer.subarray(20, 20 + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(36, 36 + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(52);

  const keys = await getAllEncryptionKeys();
  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    try {
      const key = Buffer.from(keys[i], 'base64');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted;
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw new Error('decryptBuffer: failed with all available keys');
}

/**
 * Check if a buffer is BENC-encrypted (starts with magic bytes).
 * @param {Buffer} buf
 * @returns {boolean}
 */
export function isEncryptedFile(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return false;
  return buf.subarray(0, 4).equals(FILE_MAGIC);
}

export default {
  initializeEncryptionKeys,
  getCurrentEncryptionKey,
  getAllEncryptionKeys,
  rotateEncryptionKeys,
  encryptMessage,
  decryptMessage,
  isBackendEncrypted,
  getEncryptionStats,
  encryptBuffer,
  decryptBuffer,
  isEncryptedFile,
};
