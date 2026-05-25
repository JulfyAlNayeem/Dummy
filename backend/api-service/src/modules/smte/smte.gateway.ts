/**
 * SMTE Gateway
 * Handles Server-Managed Transport Encryption socket events
 * 
 * Events:
 * - smte:request-keys   → Client requests transport keys for a conversation
 * - smte:key-rotated    ← Server pushes rotated keys to all participants
 */

import { Server, Socket } from 'socket.io';
import logger from '../../common/utils/logger.js';
import { getOrCreateTransportKeys } from '../../services/smteService.js';
import prisma from '../../config/database.js';

export class SMTEGateway {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket: Socket) {
    socket.on('smte:request-keys', (data: any, callback?: any) => 
      this.handleRequestKeys(socket, data, callback)
    );
  }

  /**
   * Client asks for transport keys for a conversation.
   * Validates that the user is actually a participant before handing out keys.
   */
  async handleRequestKeys(socket: Socket, { conversationId }: { conversationId: string }, callback?: Function) {
    try {
      const userId = (socket as any).user?.id;
      if (!userId) throw new Error('Unauthenticated socket');

      // Verify membership
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });

      if (!participant) throw new Error('Not a participant of this conversation');

      // Get or create keys
      const { keys, version } = await getOrCreateTransportKeys(conversationId);

      logger.debug({ userId, conversationId, version }, '🔑 SMTE: keys delivered');

      if (typeof callback === 'function') {
        callback({ success: true, keys, version });
      }
    } catch (error: any) {
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
  async broadcastRotatedKeys(conversationId: string, keys: string[], version: number) {
    try {
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      });

      if (!participants.length) return;

      for (const { userId } of participants) {
        this.io.to(`user_${userId}`).emit('smte:key-rotated', {
          conversationId,
          keys,
          version,
        });
      }

      logger.debug({ conversationId, version }, '📡 SMTE: rotated keys broadcast');
    } catch (error: any) {
      logger.error({ error: error.message, conversationId }, '❌ SMTE: broadcast failed');
    }
  }

  handleDisconnect(_socket: Socket, _reason?: string) {
    // No cleanup needed for SMTE gateway
  }
}
