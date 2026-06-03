/**
 * Socket Authentication Middleware
 * Verifies JWT tokens for WebSocket connections
 */

import cookie from "cookie";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

export const socketAuthMiddleware = (socket, next) => {
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
};
