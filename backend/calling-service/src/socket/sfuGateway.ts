import type { Server, Socket } from 'socket.io';
import type { RedisClientType } from 'redis';
import { createRouter, createWebRtcTransport } from '../config/mediasoup.js';
import type { AuthenticatedSocket } from '../middleware/auth.js';

interface PeerState {
  socketId: string;
  transports: Map<string, any>;
  producers: Map<string, any>;
  consumers: Map<string, any>;
}

interface RoomState {
  router: any;
  callId: string;
  peers: Map<string, PeerState>;
}

/**
 * SFUGateway - Handles mediasoup SFU operations for group calls.
 * Each group call gets its own mediasoup Router.
 * Participants create transports, produce (send) and consume (receive) media.
 *
 * Architecture:
 *   Participant A ──> Producer (audio/video) ──> Router ──> Consumer ──> Participant B
 *   Participant B ──> Producer (audio/video) ──> Router ──> Consumer ──> Participant A
 *   Participant C ──> Producer (audio/video) ──> Router ──> Consumer ──> Participant A, B
 */
export class SFUGateway {
  private io: Server;
  private workers: any[];
  private redis: RedisClientType;

  // Room state: Map<roomId, RoomState>
  private rooms: Map<string, RoomState>;

  constructor(io: Server, workers: any[], redisClient: RedisClientType) {
    this.io = io;
    this.workers = workers;
    this.redis = redisClient;
    this.rooms = new Map();
  }

  handleConnection(socket: AuthenticatedSocket): void {
    // ──── SFU Transport & Media ────
    socket.on('sfu:join-room', (data: any, callback: any) => this.handleJoinRoom(socket, data, callback));
    socket.on('sfu:create-transport', (data: any, callback: any) => this.handleCreateTransport(socket, data, callback));
    socket.on('sfu:connect-transport', (data: any, callback: any) => this.handleConnectTransport(socket, data, callback));
    socket.on('sfu:produce', (data: any, callback: any) => this.handleProduce(socket, data, callback));
    socket.on('sfu:consume', (data: any, callback: any) => this.handleConsume(socket, data, callback));
    socket.on('sfu:resume-consumer', (data: any, callback: any) => this.handleResumeConsumer(socket, data, callback));
    socket.on('sfu:get-producers', (data: any, callback: any) => this.handleGetProducers(socket, data, callback));
    socket.on('sfu:leave-room', (data: any) => this.handleLeaveRoom(socket, data));
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;

    // Remove peer from all rooms they're in
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.peers.has(userId)) {
        this.removePeer(roomId, userId, socket);
      }
    }
  }

  /**
   * Join an SFU room (creates router if needed)
   */
  private async handleJoinRoom(
    socket: AuthenticatedSocket,
    { roomId, callId }: { roomId: string; callId: string },
    callback?: (result: any) => void,
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;

    try {
      let room = this.rooms.get(roomId);

      if (!room) {
        // Create new router for this room
        const router = await createRouter();
        room = {
          router,
          callId,
          peers: new Map(),
        };
        this.rooms.set(roomId, room);
        console.log(`🎥 SFU Room created: ${roomId}`);
      }

      // Add peer to room
      room.peers.set(userId, {
        socketId: socket.id,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });

      socket.join(`sfu_${roomId}`);

      // Get RTP capabilities for the client
      const rtpCapabilities = room.router.rtpCapabilities;

      // Notify other peers
      socket.to(`sfu_${roomId}`).emit('sfu:new-peer', {
        peerId: userId,
        peerName: (socket.user as any)?.name || 'Unknown',
      });

      callback?.({
        success: true,
        rtpCapabilities,
        existingPeers: Array.from(room.peers.keys()).filter((id) => id !== userId),
      });

      console.log(`🎥 ${userId} joined SFU room ${roomId}`);
    } catch (error: any) {
      console.error('Error joining SFU room:', error);
      callback?.({ success: false, error: error.message });
    }
  }

  /**
   * Create a WebRTC transport (send or receive)
   */
  private async handleCreateTransport(
    socket: AuthenticatedSocket,
    { roomId, direction }: { roomId: string; direction: string },
    callback?: (result: any) => void,
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;

    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      const peer = room.peers.get(userId);
      if (!peer) {
        callback?.({ success: false, error: 'Peer not in room' });
        return;
      }

      const { transport, params } = await createWebRtcTransport(room.router);

      // Store transport with direction label
      const transportKey = `${direction}_${transport.id}`;
      peer.transports.set(transportKey, transport);

      callback?.({
        success: true,
        params,
        direction,
      });
    } catch (error: any) {
      console.error('Error creating transport:', error);
      callback?.({ success: false, error: error.message });
    }
  }

  /**
   * Connect a transport (DTLS handshake)
   */
  private async handleConnectTransport(
    socket: AuthenticatedSocket,
    { roomId, transportId, dtlsParameters }: { roomId: string; transportId: string; dtlsParameters: any },
    callback?: (result: any) => void,
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;

    try {
      const room = this.rooms.get(roomId);
      const peer = room?.peers.get(userId);
      if (!peer) {
        callback?.({ success: false, error: 'Peer not found' });
        return;
      }

      // Find transport
      const transport = this.findTransport(peer, transportId);
      if (!transport) {
        callback?.({ success: false, error: 'Transport not found' });
        return;
      }

      await transport.connect({ dtlsParameters });
      callback?.({ success: true });
    } catch (error: any) {
      console.error('Error connecting transport:', error);
      callback?.({ success: false, error: error.message });
    }
  }

  /**
   * Produce media (start sending audio/video)
   */
  private async handleProduce(
    socket: AuthenticatedSocket,
    { roomId, transportId, kind, rtpParameters, appData }: {
      roomId: string; transportId: string; kind: string; rtpParameters: any; appData?: any;
    },
    callback?: (result: any) => void,
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;

    try {
      const room = this.rooms.get(roomId);
      const peer = room?.peers.get(userId);
      if (!peer) {
        callback?.({ success: false, error: 'Peer not found' });
        return;
      }

      const transport = this.findTransport(peer, transportId);
      if (!transport) {
        callback?.({ success: false, error: 'Transport not found' });
        return;
      }

      const producer = await transport.produce({ kind, rtpParameters, appData });
      peer.producers.set(producer.id, producer);

      producer.on('transportclose', () => {
        producer.close();
        peer.producers.delete(producer.id);
      });

      // Notify other peers about the new producer
      socket.to(`sfu_${roomId}`).emit('sfu:new-producer', {
        producerId: producer.id,
        peerId: userId,
        kind: producer.kind,
      });

      callback?.({
        success: true,
        producerId: producer.id,
      });

      console.log(`🎥 ${userId} producing ${kind} in room ${roomId}`);
    } catch (error: any) {
      console.error('Error producing:', error);
      callback?.({ success: false, error: error.message });
    }
  }

  /**
   * Consume media (start receiving another peer's audio/video)
   */
  private async handleConsume(
    socket: AuthenticatedSocket,
    { roomId, producerId, rtpCapabilities, transportId }: {
      roomId: string; producerId: string; rtpCapabilities: any; transportId: string;
    },
    callback?: (result: any) => void,
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;

    try {
      const room = this.rooms.get(roomId);
      const peer = room?.peers.get(userId);
      if (!room || !peer) {
        callback?.({ success: false, error: 'Room or peer not found' });
        return;
      }

      // Check if router can consume
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        callback?.({ success: false, error: 'Cannot consume this producer' });
        return;
      }

      const transport = this.findTransport(peer, transportId);
      if (!transport) {
        callback?.({ success: false, error: 'Transport not found' });
        return;
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Start paused, client will resume after setup
      });

      peer.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        consumer.close();
        peer.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        consumer.close();
        peer.consumers.delete(consumer.id);
        socket.emit('sfu:producer-closed', { consumerId: consumer.id, producerId });
      });

      callback?.({
        success: true,
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (error: any) {
      console.error('Error consuming:', error);
      callback?.({ success: false, error: error.message });
    }
  }

  /**
   * Resume a paused consumer
   */
  private async handleResumeConsumer(
    socket: AuthenticatedSocket,
    { roomId, consumerId }: { roomId: string; consumerId: string },
    callback?: (result: any) => void,
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;

    try {
      const room = this.rooms.get(roomId);
      const peer = room?.peers.get(userId);
      const consumer = peer?.consumers.get(consumerId);

      if (!consumer) {
        callback?.({ success: false, error: 'Consumer not found' });
        return;
      }

      await consumer.resume();
      callback?.({ success: true });
    } catch (error: any) {
      console.error('Error resuming consumer:', error);
      callback?.({ success: false, error: error.message });
    }
  }

  /**
   * Get all existing producers in a room
   */
  private handleGetProducers(
    socket: AuthenticatedSocket,
    { roomId }: { roomId: string },
    callback?: (result: any) => void,
  ): void {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;

    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      const producers: Array<{ producerId: string; peerId: string; kind: string }> = [];
      for (const [peerId, peer] of room.peers.entries()) {
        if (peerId !== userId) {
          for (const [producerId, producer] of peer.producers.entries()) {
            producers.push({
              producerId,
              peerId,
              kind: producer.kind,
            });
          }
        }
      }

      callback?.({ success: true, producers });
    } catch (error: any) {
      console.error('Error getting producers:', error);
      callback?.({ success: false, error: error.message });
    }
  }

  /**
   * Leave an SFU room
   */
  private handleLeaveRoom(
    socket: AuthenticatedSocket,
    { roomId }: { roomId: string },
  ): void {
    const userId = socket.user?.userId || socket.user?.id;
    if (!userId) return;
    this.removePeer(roomId, userId, socket);
  }

  // ═══════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════

  private removePeer(roomId: string, userId: string, socket: Socket): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(userId);
    if (!peer) return;

    // Close all transports (this also closes producers/consumers)
    for (const transport of peer.transports.values()) {
      transport.close();
    }

    room.peers.delete(userId);
    socket.leave(`sfu_${roomId}`);

    // Notify others
    socket.to(`sfu_${roomId}`).emit('sfu:peer-left', {
      peerId: userId,
    });

    // If room is empty, clean up
    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(roomId);
      console.log(`🎥 SFU Room closed: ${roomId}`);
    }

    console.log(`🎥 ${userId} removed from SFU room ${roomId}`);
  }

  private findTransport(peer: PeerState, transportId: string): any {
    for (const [key, transport] of peer.transports.entries()) {
      if (transport.id === transportId || key.includes(transportId)) {
        return transport;
      }
    }
    return null;
  }
}
