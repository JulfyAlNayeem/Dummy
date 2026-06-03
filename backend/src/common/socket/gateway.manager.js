/**
 * Gateway Manager
 * Registers all module gateways with the Socket.IO server
 */

import logger from "../utils/logger.js";

export class GatewayManager {
  constructor(io) {
    this.io = io;
    this.gateways = [];
  }

  /**
   * Register a gateway
   * @param {Object} Gateway - Gateway class
   */
  register(Gateway) {
    const gateway = new Gateway(this.io);
    this.gateways.push(gateway);
    return gateway;
  }

  /**
   * Initialize all registered gateways
   */
  initialize() {
    logger.info(`🔌 Initializing ${this.gateways.length} socket gateways...`);
    
    this.io.on("connection", (socket) => {
      logger.info({ 
        id: socket.id, 
        userId: socket.user?.id 
      }, "🔌 Socket connected");

      // Register all gateway handlers
      this.gateways.forEach(gateway => {
        if (typeof gateway.handleConnection === 'function') {
          gateway.handleConnection(socket);
        }
      });

      // Global disconnect handler
      socket.on("disconnect", (reason) => {
        logger.info({ 
          id: socket.id, 
          userId: socket.user?.id,
          reason 
        }, "🔌 Socket disconnected");
        
        // Call disconnect handlers for all gateways
        this.gateways.forEach(gateway => {
          if (typeof gateway.handleDisconnect === 'function') {
            gateway.handleDisconnect(socket, reason);
          }
        });
      });
    });

    logger.info("✅ All socket gateways initialized");
  }

  /**
   * Get a specific gateway by name
   */
  getGateway(name) {
    return this.gateways.find(g => g.constructor.name === name);
  }
}
