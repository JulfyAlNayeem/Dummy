/**
 * User Gateway
 * Handles user presence and online status events
 * 
 * Events:
 * - user:online - User comes online
 * - user:offline - User goes offline
 * - user:status - Get user status
 */

import logger from "../../common/utils/logger.js";

// Global online users map (userId -> Set of socketIds)
export const onlineUsers = new Map();

export class UserGateway {
  constructor(io) {
    this.io = io;
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    const userId = socket.user?.id;
    
    if (userId) {
      // Auto-mark user as online
      this.handleUserOnline(socket, userId);
    }
    
    // Register event handlers
    socket.on("userOnline", this.handleUserOnline.bind(this, socket));
    socket.on("user:online", this.handleUserOnline.bind(this, socket));
    
    socket.on("user:getStatus", this.handleGetUserStatus.bind(this, socket));
    socket.on("user:status", this.handleGetUserStatus.bind(this, socket));
  }

  /**
   * Handle user coming online
   */
  handleUserOnline(socket, userId) {
    if (!userId) {
      userId = socket.user?.id;
    }
    
    if (!userId) return;
    
    // Add to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    
    // Broadcast to all clients
    this.io.emit("userOnline", { userId });
    this.io.emit("user:online", { userId });
    
    logger.info({ 
      socketId: socket.id, 
      userId,
      totalSockets: onlineUsers.get(userId).size
    }, "User online");
  }

  /**
   * Handle user going offline
   */
  handleUserOffline(socket, userId) {
    if (!userId) {
      userId = socket.user?.id;
    }
    
    if (!userId) return;
    
    // Remove socket from user's connections
    if (onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);
      
      // If no more sockets, user is offline
      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
        
        // Broadcast user offline
        this.io.emit("userOffline", { userId });
        this.io.emit("user:offline", { userId });
        
        logger.info({ 
          socketId: socket.id, 
          userId 
        }, "User offline");
      } else {
        logger.debug({ 
          socketId: socket.id, 
          userId,
          remainingSockets: onlineUsers.get(userId).size
        }, "Socket disconnected, user still online");
      }
    }
  }

  /**
   * Get user online status
   */
  handleGetUserStatus(socket, { userId }) {
    const isOnline = onlineUsers.has(userId);
    
    socket.emit("user:status", {
      userId,
      isOnline,
      socketCount: isOnline ? onlineUsers.get(userId).size : 0
    });
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    this.handleUserOffline(socket);
  }

  /**
   * Get all online users
   */
  getOnlineUsers() {
    return Array.from(onlineUsers.keys());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return onlineUsers.has(userId);
  }
}
