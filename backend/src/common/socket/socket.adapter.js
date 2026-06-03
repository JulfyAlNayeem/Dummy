/**
 * Socket Adapter Configuration
 * Sets up Redis adapter for Socket.IO clustering
 */

import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClient } from "../../../config/redisClient.js";

export const setupRedisAdapter = async (io) => {
  const pubClient = getRedisClient();
  const subClient = pubClient.duplicate();
  
  if (!subClient.isOpen) {
    await subClient.connect();
  }
  
  io.adapter(createAdapter(pubClient, subClient));
  
  return { pubClient, subClient };
};
