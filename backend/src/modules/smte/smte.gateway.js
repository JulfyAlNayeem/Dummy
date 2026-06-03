/**
 * SMTE Gateway
 * Handles Server-Managed Transport Encryption socket events
 * 
 * Events:
 * - smte:request-keys   → Client requests transport keys for a conversation
 * - smte:key-rotated    ← Server pushes rotated keys to all participants
 */

import logger from '../../common/utils/logger.js';
import {
  getOrCreateTransportKeys,
} from '../../../services/smteService.js';
import Conversation from '../../common/models/conversationModel.js';

export class SMTEGateway {
  constructor(io) {
    this.io = io;
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    socket.on('smte:request-keys', this.handleRequestKeys.bind(this, socket));
  }

  /**
   * Client asks for transport keys for a conversation.
   * Validates that the user is actually a participant before handing out keys.
   */
  async handleRequestKeys(socket, { conversationId }, callback) {
    try {
      const userId = socket.user?.id || socket.user?._id;
      if (!userId) throw new Error('Unauthenticated socket');

      // Verify membership
      const conversation = await Conversation.findById(conversationId)
        .select('participants')
        .lean();

      if (!conversation) throw new Error('Conversation not found');

      const isMember = conversation.participants.some(
        (p) => p.toString() === userId.toString()
      );
      if (!isMember) throw new Error('Not a participant of this conversation');

      // Get or create keys
      const { keys, version } = await getOrCreateTransportKeys(conversationId);

      logger.debug({ userId, conversationId, version }, '🔑 SMTE: keys delivered');

      if (typeof callback === 'function') {
        callback({ success: true, keys, version });
      }
    } catch (error) {
      logger.error({ error: error.message }, '❌ SMTE: request-keys failed');
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  }

  /**
   * Push rotated keys to every connected participant of a conversation.
   * Called from the rotation cron job (not from a client event).
   */
  async broadcastRotatedKeys(conversationId, keys, version) {
    try {
      const conversation = await Conversation.findById(conversationId)
        .select('participants')
        .lean();
      if (!conversation) return;

      for (const pid of conversation.participants) {
        this.io.to(`user_${pid.toString()}`).emit('smte:key-rotated', {
          conversationId,
          keys,
          version,
        });
      }

      logger.debug({ conversationId, version }, '📡 SMTE: rotated keys broadcast');
    } catch (error) {
      logger.error({ error: error.message, conversationId }, '❌ SMTE: broadcast failed');
    }
  }
}
