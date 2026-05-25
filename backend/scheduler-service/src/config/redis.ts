import { createClient } from 'redis';
import pino from 'pino';
const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
let redisClient: ReturnType<typeof createClient>;
export const connectRedis = async () => {
  redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
  await redisClient.connect();
  return redisClient;
};
export const getRedisClient = () => { if (!redisClient) throw new Error('Redis not initialized'); return redisClient; };
