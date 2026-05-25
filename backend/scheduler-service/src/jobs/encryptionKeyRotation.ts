import cron from 'node-cron';
import crypto from 'crypto';
import pino from 'pino';
import { getRedisClient } from '../config/redis.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

const REDIS_KEY_PREFIX = 'backend_encryption_keys';
const KEY_ARRAY_SIZE = 5;
const KEY_LENGTH = 32;

function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/** Rotate the oldest encryption key (runs every 24 hours) */
export const startEncryptionKeyRotationJob = (): void => {
  cron.schedule('0 3 * * *', async () => {
    try {
      const redis = getRedisClient();
      const newKey = generateKey();
      const before = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);

      await redis.lPush(REDIS_KEY_PREFIX, newKey);
      await redis.lTrim(REDIS_KEY_PREFIX, 0, KEY_ARRAY_SIZE - 1);

      const after = await redis.lRange(REDIS_KEY_PREFIX, 0, -1);
      logger.info({ previousCount: before.length, newCount: after.length }, 'Encryption keys rotated');
    } catch (err) {
      logger.error({ err }, 'Encryption key rotation failed');
    }
  });

  logger.info('Encryption key rotation job started (daily at 03:00)');
};
