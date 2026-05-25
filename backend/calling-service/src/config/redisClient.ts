import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType> => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({ url }) as RedisClientType;

  redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('✅ Calling service Redis connected'));

  await redisClient.connect();
  return redisClient;
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) throw new Error('Redis client not initialized');
  return redisClient;
};
