import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClient } from "../config/redisClient.js";
import logger from "../utils/logger.js";
import { registerOnlineUserHandlers } from "./onlineUserSocket.js";
import { registerChatHandlers } from "./chatSocket.js";
import registerAlertnessHandlers from "./alertnessSocket.js";
import { registerConversationActiveUsersHandlers } from "./conversationActiveUsers.js";
import { registerConversationHandlers } from "./conversationSocket.js";
import { registerEncryptionKeyHandlers } from "./encryptionKeySocket.js";
import { registerCentralizedMessageHandlers } from "./centralizedMessageSocket.js";

export const initialSocketServer = async (server, redis) => {
  const allowedOrigins = process.env.ORIGIN_URL.split(',').map(s => s.trim());
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
  });

  // Set up Redis adapter
  const pubClient = getRedisClient();
  const subClient = pubClient.duplicate();
  if (!subClient.isOpen) await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  // JWT authentication middleware
  io.use((socket, next) => {
    let token = null;
    
    // Try to get token from cookies first
    const cookies = socket.handshake.headers.cookie;
    if (cookies) {
      const parsedCookies = cookie.parse(cookies);
      // Try both camelCase and snake_case cookie names
      token = parsedCookies.accessToken || parsedCookies.access_token;
    }
    
    // Fallback: try to get token from query string (for some clients)
    if (!token && socket.handshake.query?.token) {
      token = socket.handshake.query.token;
    }
    
    if (!token) {
      logger.warn({ id: socket.id }, "⚠️  No accessToken found in cookies or query");
      return next(new Error('Authentication required'));
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        logger.warn({ id: socket.id, error: err.message }, "⚠️  JWT verification failed");
        return next(new Error('Authentication failed'));
      }
      socket.user = decoded;
      logger.info({ id: socket.id, userId: decoded?.id }, "✅ Socket authenticated successfully");
      next();
    });
  });

  // Socket.IO event handlers
  io.on("connection", (socket) => {
    logger.info({ id: socket.id }, "🔌 Socket connected");

    // Register centralized message handler FIRST (handles auto-join to all conversations)
    registerCentralizedMessageHandlers(io, socket);
    
    // Register other custom handlers
    registerConversationHandlers(io, socket);
    registerOnlineUserHandlers(io, socket);
    registerConversationActiveUsersHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerAlertnessHandlers(io, socket);
    registerEncryptionKeyHandlers(io, socket);

    // Existing conversation-specific handlers
    socket.on("join:conversation", (conversationId) => {
      socket.join(`conv:${conversationId}`);
      logger.info({ id: socket.id, conversationId }, "Joined conversation");
    });

    socket.on("message:send", ({ conversationId, message }) => {
      io.to(`conv:${conversationId}`).emit("message:new", { conversationId, message });
      logger.info({ conversationId }, "Message sent");
    });

    socket.on("disconnect", (reason) => {
      logger.info({ id: socket.id, reason }, "🔌 Socket disconnected");
    });
  });

  return io;
};