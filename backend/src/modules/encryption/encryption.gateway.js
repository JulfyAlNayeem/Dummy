/**
 * Encryption Gateway
 * Handles end-to-end encryption key exchange events
 * 
 * Events:
 * - encryption:exchange-key - Exchange public keys
 * - encryption:regenerate-key - Regenerate and exchange public keys
 * - encryption:fetch-keys - Fetch conversation keys
 * - encryption:verify-key - Verify encryption key
 * - encryption:key-generated - Notify key generation
 * 
 * Broadcasts:
 * - encryption:key-exchanged - When a key is first exchanged
 * - encryption:key-updated - When a key is generated/regenerated
 */

import logger from "../../common/utils/logger.js";

export class EncryptionGateway {
  constructor(io) {
    this.io = io;
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    socket.on("encryption:exchange-key", this.handleExchangeKey.bind(this, socket));
    socket.on("encryption:regenerate-key", this.handleExchangeKey.bind(this, socket));
    socket.on("encryption:fetch-keys", this.handleFetchKeys.bind(this, socket));
    socket.on("encryption:verify-key", this.handleVerifyKey.bind(this, socket));
    socket.on("encryption:key-generated", this.handleKeyGenerated.bind(this, socket));
  }

  /**
   * Handle encryption key exchange
   */
  async handleExchangeKey(socket, { conversationId, publicKey }, callback) {
    try {
      const userId = socket.user?.id || socket.user?._id;
      
      if (!userId) {
        throw new Error('User ID not found in socket');
      }
      
      // Import the controller to save key to database
      const { exchangeConversationKey } = await import("../conversationKey/conversationKey.controller.js");
      
      // Create a Promise to capture controller response
      let savedKeyData = null;
      let captureCompleted = false;
      
      const mockRes = {
        status: (code) => {
          console.log('📊 Mock response status:', code);
          const responseObject = {
            json: (data) => {
              console.log('📦 Mock response data:', JSON.stringify(data, null, 2));
              if (code === 200 && data.success && data.data) {
                savedKeyData = data.data;
                captureCompleted = true;
                console.log('✅ Captured keyId:', savedKeyData.keyId, 'keyVersion:', savedKeyData.keyVersion);
              } else {
                console.log('⚠️ Response did not match capture conditions:', { code, success: data.success, hasData: !!data.data });
              }
              return data;
            }
          };
          return responseObject;
        }
      };
      
      const mockReq = {
        user: {
          _id: userId,
          id: userId,
          ...socket.user
        },
        params: { conversationId },
        body: { publicKey }
      };
      
      // Save to database first
      await exchangeConversationKey(mockReq, mockRes);
      
      // Verify capture
      if (!captureCompleted || !savedKeyData) {
        console.error('❌ Failed to capture savedKeyData from controller response');
        throw new Error('Failed to capture key metadata from database save');
      }
      
      console.log('🔑 Broadcasting key exchange with metadata:', {
        keyId: savedKeyData.keyId,
        keyVersion: savedKeyData.keyVersion,
        userId
      });
      
      // Broadcast to conversation (except sender) with key metadata
      socket.to(`conv:${conversationId}`).emit("encryption:key-exchanged", {
        conversationId,
        userId,
        publicKey,
        keyId: savedKeyData.keyId,
        keyVersion: savedKeyData.keyVersion
      });
      
      // Return success with key metadata to sender
      if (typeof callback === 'function') {
        console.log('📤 Sending callback response with data:', savedKeyData);
        callback({ 
          success: true,
          data: savedKeyData
        });
      }
      
      logger.debug({ 
        userId,
        conversationId,
        keyId: savedKeyData.keyId,
        keyVersion: savedKeyData.keyVersion
      }, "Encryption key exchanged and saved");
    } catch (error) {
      console.error('❌ Exchange key error:', error);
      logger.error({ error: error.message }, "Exchange key error");
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  }

  /**
   * Handle fetch encryption keys
   */
  async handleFetchKeys(socket, { conversationId }, callback) {
    try {
      // In a real implementation, fetch from database
      // For now, just acknowledge
      
      if (typeof callback === 'function') {
        callback({ 
          success: true,
          keys: [] // Return stored keys from DB
        });
      }
      
      logger.debug({ conversationId }, "Fetching encryption keys");
    } catch (error) {
      logger.error({ error: error.message }, "Fetch keys error");
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  }

  /**
   * Handle verify encryption key
   */
  async handleVerifyKey(socket, { conversationId }, callback) {
    try {
      // In real implementation, verify key validity
      
      if (typeof callback === 'function') {
        callback({ 
          success: true,
          verified: true
        });
      }
      
      logger.debug({ conversationId }, "Verifying encryption key");
    } catch (error) {
      logger.error({ error: error.message }, "Verify key error");
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  }

  /**
   * Handle key generated notification
   */
  async handleKeyGenerated(socket, { conversationId, publicKey, keyId, keyVersion }) {
    const userId = socket.user?.id;
    
    // Broadcast to conversation with publicKey so others can decrypt
    this.io.to(`conv:${conversationId}`).emit("encryption:key-updated", {
      conversationId,
      userId,
      publicKey,
      keyId,
      keyVersion
    });
    
    logger.info({ 
      userId,
      conversationId,
      keyId,
      keyVersion
    }, "Encryption key generated and broadcasted");
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    logger.debug({ 
      socketId: socket.id, 
      reason 
    }, "Encryption gateway disconnect");
  }
}
