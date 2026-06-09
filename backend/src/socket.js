/**
 * Socket.IO Server Initialization
 * NestJS-inspired modular socket architecture
 */

import { Server } from "socket.io";
import logger from "./common/utils/logger.js";
import { socketAuthMiddleware } from "./common/socket/socket.middleware.js";
import { setupRedisAdapter } from "./common/socket/socket.adapter.js";
import { GatewayManager } from "./common/socket/gateway.manager.js";

// Import gateways from modules
import { MessageGateway } from "./modules/message/message.gateway.js";
import { ConversationGateway } from "./modules/conversation/conversation.gateway.js";
import { UserGateway } from "./modules/user/user.gateway.js";
import { AlertnessGateway } from "./modules/alertness/alertness.gateway.js";
import { EncryptionGateway } from "./modules/encryption/encryption.gateway.js";
import { SMTEGateway } from "./modules/smte/smte.gateway.js";
import { CallingGateway } from "./modules/calling/gateway/calling.gateway.js";

/**
 * Initialize Socket.IO server with modular gateway architecture
 */
export const initializeSocketServer = async (server, redis) => {
  const allowedOrigins = process.env.ORIGIN_URL.split(',').map(s => s.trim());
  
  // Single Socket.IO server — GatewayManager routes events to correct gateway
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    transports: ['polling', 'websocket'],
    allowUpgrades: true,
  });

  logger.info("🔌 Initializing Socket.IO server...");

  // Set up Redis adapter for clustering
  await setupRedisAdapter(io);
  logger.info("✅ Redis adapter configured");

  // Set up authentication middleware
  io.use(socketAuthMiddleware);
  logger.info("✅ Socket authentication middleware configured");

  // Create gateway manager
  const gatewayManager = new GatewayManager(io);

  // Register all gateways
  gatewayManager.register(UserGateway);           // User presence
  gatewayManager.register(ConversationGateway);   // Conversation management
  gatewayManager.register(MessageGateway);        // Messaging
  gatewayManager.register(AlertnessGateway);      // Alertness sessions
  gatewayManager.register(EncryptionGateway);     // End-to-end encryption
  gatewayManager.register(SMTEGateway);           // Server-managed transport encryption
  gatewayManager.register(CallingGateway);        // ← Calling (1:1 + group)

  // Initialize all gateways
  gatewayManager.initialize();

  logger.info("✅ Socket.IO server initialized with modular architecture");

  return io;
};

// Legacy export for compatibility
export const initialSocketServer = initializeSocketServer;