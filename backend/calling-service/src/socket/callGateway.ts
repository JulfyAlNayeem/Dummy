import type { Server, Socket } from 'socket.io';
import type { RedisClientType } from 'redis';
import prisma from '../config/database.js';
import type { AuthenticatedSocket } from '../middleware/auth.js';
import type { CallStatus, ParticipantStatus, EndReason } from '../generated/prisma/enums.js';

/**
 * CallGateway - Handles 1:1 and group call signaling.
 *
 * Call Flow (1:1):
 *   Caller                  Server                   Callee
 *   ──────                  ──────                   ──────
 *   call:initiate    ──>    create call record  ──>  call:incoming
 *                    <──    call:initiated
 *
 *                                               <──  call:accept
 *                    ──>    update call status   ──>  call:accepted
 *
 *   signal:offer     ──>                        ──>  signal:offer
 *                    <──                         <──  signal:answer
 *   signal:answer    <──
 *
 *   signal:ice-candidate ──>                    ──>  signal:ice-candidate
 *                    <──                         <──  signal:ice-candidate
 *
 *   call:end         ──>    update call record  ──>  call:ended
 *
 * Call Flow (Group):
 *   Caller                  Server                   All Participants
 *   ──────                  ──────                   ────────────────
 *   call:initiate-group ──> create call + room  ──>  call:incoming-group
 *                                               <──  call:join-group
 *                    ──>    connect to SFU       ──>  call:participant-joined
 *                           (handled by SFU Gateway)
 */
export class CallGateway {
  private io: Server;
  private redis: RedisClientType;
  // Map<callId, Set<socketId>> for active calls
  private activeCalls: Map<string, Set<string>>;
  // Map<userId, callId> for quick lookup
  private userActiveCalls: Map<string, string>;
  // Ringing timeout (30 seconds)
  private RING_TIMEOUT = 30000;
  private ringTimeouts: Map<string, ReturnType<typeof setTimeout>>;

  constructor(io: Server, redisClient: RedisClientType) {
    this.io = io;
    this.redis = redisClient;
    this.activeCalls = new Map();
    this.userActiveCalls = new Map();
    this.ringTimeouts = new Map();
  }

  handleConnection(socket: AuthenticatedSocket): void {
    // ──── 1:1 Calling ────
    socket.on('call:initiate', (data: any) => this.handleInitiateCall(socket, data));
    socket.on('call:accept', (data: any) => this.handleAcceptCall(socket, data));
    socket.on('call:decline', (data: any) => this.handleDeclineCall(socket, data));
    socket.on('call:end', (data: any) => this.handleEndCall(socket, data));
    socket.on('call:cancel', (data: any) => this.handleCancelCall(socket, data));
    socket.on('call:busy', (data: any) => this.handleBusyCall(socket, data));

    // ──── Group Calling ────
    socket.on('call:initiate-group', (data: any) => this.handleInitiateGroupCall(socket, data));
    socket.on('call:join-group', (data: any) => this.handleJoinGroupCall(socket, data));
    socket.on('call:leave-group', (data: any) => this.handleLeaveGroupCall(socket, data));

    // ──── WebRTC Signaling (P2P for 1:1) ────
    socket.on('signal:offer', (data: any) => this.handleSignalOffer(socket, data));
    socket.on('signal:answer', (data: any) => this.handleSignalAnswer(socket, data));
    socket.on('signal:ice-candidate', (data: any) => this.handleIceCandidate(socket, data));

    // ──── Media Controls ────
    socket.on('call:toggle-audio', (data: any) => this.handleToggleAudio(socket, data));
    socket.on('call:toggle-video', (data: any) => this.handleToggleVideo(socket, data));
    socket.on('call:screen-share', (data: any) => this.handleScreenShare(socket, data));

    // ──── Active call check ────
    socket.on('call:check-active', () => this.handleCheckActive(socket));
  }

  handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    const callId = this.userActiveCalls.get(userId);

    if (callId) {
      // End the call if user disconnects
      this.endCallForUser(userId, callId, 'network_error');
    }
  }

  // ═══════════════════════════════════════
  //  1:1 CALL HANDLERS
  // ═══════════════════════════════════════

  private async handleInitiateCall(
    socket: AuthenticatedSocket,
    { calleeId, callType, conversationId }: { calleeId: string; callType: 'audio' | 'video'; conversationId?: string },
  ): Promise<void> {
    const callerId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!callerId) return;

    try {
      // Check if callee is already in a call
      const calleeInCall = this.userActiveCalls.has(calleeId);
      if (calleeInCall) {
        socket.emit('call:busy', { calleeId, message: 'User is already in a call' });
        return;
      }

      // Check if caller is already in a call
      if (this.userActiveCalls.has(callerId)) {
        socket.emit('call:error', { message: 'You are already in a call' });
        return;
      }

      // Look up caller and callee user info from the database
      const [callerUser, calleeUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: callerId }, select: { name: true, image: true } }),
        prisma.user.findUnique({ where: { id: calleeId }, select: { name: true, image: true } }),
      ]);

      const callerName = callerUser?.name || 'Unknown';
      const callerImage = callerUser?.image || null;
      const calleeName = calleeUser?.name || 'Unknown';
      const calleeImage = calleeUser?.image || null;

      // Create call record
      const roomId = crypto.randomUUID();
      const call = await prisma.call.create({
        data: {
          callerId,
          callType,
          isGroup: false,
          conversationId: conversationId || null,
          roomId,
          status: 'ringing',
          participants: {
            create: [
              { userId: callerId, status: 'accepted', joinedAt: new Date(), hasVideo: callType === 'video' },
              { userId: calleeId, status: 'ringing', hasVideo: callType === 'video' },
            ],
          },
        },
        include: { participants: true },
      });

      const callId = call.id;

      // Track active call
      this.activeCalls.set(callId, new Set([socket.id]));
      this.userActiveCalls.set(callerId, callId);

      // Join call room
      socket.join(`call_${callId}`);

      // Store call state in Redis for cross-service access
      await this.redis.set(`call:${callId}`, JSON.stringify({
        callId,
        callerId,
        calleeId,
        callType,
        status: 'ringing',
        conversationId,
        startedAt: null,
      }), { EX: 3600 }); // 1 hour TTL

      // Notify caller (include callee info so UI can show who is being called)
      socket.emit('call:initiated', {
        callId,
        callType,
        calleeId,
        conversationId,
        calleeInfo: { id: calleeId, name: calleeName, image: calleeImage },
      });

      // Notify callee
      this.io.to(`call_user_${calleeId}`).emit('call:incoming', {
        callId,
        callerId,
        callerName,
        callerImage,
        callType,
        conversationId,
      });

      // Also notify main backend via Redis pub/sub
      await this.redis.publish('call:events', JSON.stringify({
        event: 'call:incoming',
        callId,
        callerId,
        calleeId,
        callType,
        conversationId,
      }));

      // Set ringing timeout
      const timeout = setTimeout(() => {
        this.handleMissedCall(callId, callerId, calleeId);
      }, this.RING_TIMEOUT);
      this.ringTimeouts.set(callId, timeout);

      console.log(`📞 Call initiated: ${callerId} → ${calleeId} (${callType})`);
    } catch (error) {
      console.error('Error initiating call:', error);
      socket.emit('call:error', { message: 'Failed to initiate call' });
    }
  }

  private async handleAcceptCall(
    socket: AuthenticatedSocket,
    { callId }: { callId: string },
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    try {
      // Clear ringing timeout
      this.clearRingTimeout(callId);

      // Update call record - set status to ongoing and update participant
      const call = await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'ongoing',
          startedAt: new Date(),
          participants: {
            updateMany: {
              where: { userId },
              data: { status: 'accepted', joinedAt: new Date() },
            },
          },
        },
        include: { participants: true },
      });

      // Track user in call
      this.userActiveCalls.set(userId, callId);
      const socketSet = this.activeCalls.get(callId) || new Set();
      socketSet.add(socket.id);
      this.activeCalls.set(callId, socketSet);

      // Join call room
      socket.join(`call_${callId}`);

      // Update Redis
      const callStateStr = await this.redis.get(`call:${callId}`);
      const callState = JSON.parse(callStateStr || '{}');
      callState.status = 'ongoing';
      callState.startedAt = new Date().toISOString();
      await this.redis.set(`call:${callId}`, JSON.stringify(callState), { EX: 3600 });

      // Notify all participants in the call room
      this.io.to(`call_${callId}`).emit('call:accepted', {
        callId,
        acceptedBy: userId,
        callType: call.callType,
      });

      console.log(`📞 Call accepted: ${callId} by ${userId}`);
    } catch (error) {
      console.error('Error accepting call:', error);
      socket.emit('call:error', { message: 'Failed to accept call' });
    }
  }

  private async handleDeclineCall(
    socket: AuthenticatedSocket,
    { callId }: { callId: string },
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    try {
      this.clearRingTimeout(callId);

      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'declined',
          endedAt: new Date(),
          endReason: 'declined',
          participants: {
            updateMany: {
              where: { userId },
              data: { status: 'declined' },
            },
          },
        },
      });

      // Notify all in the call room
      this.io.to(`call_${callId}`).emit('call:declined', {
        callId,
        declinedBy: userId,
      });

      // Cleanup
      this.cleanupCall(callId);

      console.log(`📞 Call declined: ${callId} by ${userId}`);
    } catch (error) {
      console.error('Error declining call:', error);
    }
  }

  private async handleEndCall(
    socket: AuthenticatedSocket,
    { callId }: { callId: string },
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;
    await this.endCallForUser(userId, callId, 'normal');
  }

  private async handleCancelCall(
    socket: AuthenticatedSocket,
    { callId }: { callId: string },
  ): Promise<void> {
    const callerId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!callerId) return;

    try {
      this.clearRingTimeout(callId);

      // Get call participants before updating
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: { participants: true },
      });

      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'missed',
          endedAt: new Date(),
          endReason: 'missed',
        },
      });

      // Emit to the call room (anyone who joined)
      this.io.to(`call_${callId}`).emit('call:cancelled', {
        callId,
        cancelledBy: callerId,
      });

      // Also emit to each participant's personal room (they haven't joined call room yet)
      if (call?.participants) {
        for (const p of call.participants) {
          if (p.userId && p.userId !== callerId) {
            this.io.to(`call_user_${p.userId}`).emit('call:cancelled', {
              callId,
              cancelledBy: callerId,
            });
          }
        }
      }

      this.cleanupCall(callId);
      console.log(`📞 Call cancelled: ${callId} by ${callerId}`);
    } catch (error) {
      console.error('Error cancelling call:', error);
    }
  }

  private async handleBusyCall(
    socket: AuthenticatedSocket,
    { callId }: { callId: string },
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    try {
      this.clearRingTimeout(callId);

      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'declined',
          endedAt: new Date(),
          endReason: 'busy',
          participants: {
            updateMany: {
              where: { userId },
              data: { status: 'busy' },
            },
          },
        },
      });

      this.io.to(`call_${callId}`).emit('call:busy-response', {
        callId,
        userId,
      });

      this.cleanupCall(callId);
    } catch (error) {
      console.error('Error handling busy call:', error);
    }
  }

  private async handleMissedCall(callId: string, callerId: string, calleeId: string): Promise<void> {
    try {
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'missed',
          endedAt: new Date(),
          endReason: 'missed',
          participants: {
            updateMany: {
              where: { userId: calleeId },
              data: { status: 'missed' },
            },
          },
        },
      });

      this.io.to(`call_user_${callerId}`).emit('call:missed', {
        callId,
        type: 'outgoing',
        calleeId,
      });

      this.io.to(`call_user_${calleeId}`).emit('call:missed', {
        callId,
        type: 'incoming',
        callerId,
      });

      // Publish to main backend for push notifications
      await this.redis.publish('call:events', JSON.stringify({
        event: 'call:missed',
        callId,
        callerId,
        calleeId,
      }));

      this.cleanupCall(callId);
      console.log(`📞 Call missed: ${callId}`);
    } catch (error) {
      console.error('Error handling missed call:', error);
    }
  }

  // ═══════════════════════════════════════
  //  GROUP CALL HANDLERS
  // ═══════════════════════════════════════

  private async handleInitiateGroupCall(
    socket: AuthenticatedSocket,
    { conversationId, callType, participantIds }: { conversationId: string; callType: 'audio' | 'video'; participantIds: string[] },
  ): Promise<void> {
    const callerId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!callerId) return;

    try {
      if (this.userActiveCalls.has(callerId)) {
        socket.emit('call:error', { message: 'You are already in a call' });
        return;
      }

      // Look up caller info from DB
      const callerUser = await prisma.user.findUnique({ where: { id: callerId }, select: { name: true, image: true } });
      const callerName = callerUser?.name || 'Unknown';
      const callerImage = callerUser?.image || null;

      const roomId = crypto.randomUUID();

      // Build participant create data
      const participantCreateData = [
        { userId: callerId, status: 'accepted' as const, joinedAt: new Date(), hasVideo: callType === 'video' },
        ...participantIds
          .filter((id: string) => id !== callerId)
          .map((id: string) => ({ userId: id, status: 'ringing' as const, hasVideo: callType === 'video' })),
      ];

      const call = await prisma.call.create({
        data: {
          callerId,
          callType,
          isGroup: true,
          conversationId,
          roomId,
          status: 'ringing',
          participants: {
            create: participantCreateData,
          },
        },
        include: { participants: true },
      });

      const callId = call.id;

      // Track
      this.activeCalls.set(callId, new Set([socket.id]));
      this.userActiveCalls.set(callerId, callId);
      socket.join(`call_${callId}`);

      // Store in Redis
      await this.redis.set(`call:${callId}`, JSON.stringify({
        callId,
        callerId,
        callType,
        isGroup: true,
        conversationId,
        roomId,
        status: 'ringing',
        participants: participantIds,
      }), { EX: 7200 }); // 2 hour TTL for group calls

      // Notify caller
      socket.emit('call:group-initiated', { callId, roomId, callType });

      // Notify all participants
      for (const pid of participantIds) {
        if (pid !== callerId) {
          this.io.to(`call_user_${pid}`).emit('call:incoming-group', {
            callId,
            roomId,
            callerId,
            callerName,
            callerImage,
            callType,
            conversationId,
            participantCount: participantIds.length,
          });
        }
      }

      // Publish to main backend
      await this.redis.publish('call:events', JSON.stringify({
        event: 'call:incoming-group',
        callId,
        callerId,
        callType,
        conversationId,
        participantIds,
      }));

      // Ringing timeout for group (60 seconds)
      const timeout = setTimeout(() => {
        this.handleGroupRingTimeout(callId);
      }, 60000);
      this.ringTimeouts.set(callId, timeout);

      console.log(`📞 Group call initiated: ${callId} in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error initiating group call:', error);
      socket.emit('call:error', { message: 'Failed to initiate group call' });
    }
  }

  private async handleJoinGroupCall(
    socket: AuthenticatedSocket,
    { callId }: { callId: string },
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    try {
      const joinerUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true } });

      // Update participant status
      const call = await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'ongoing',
          participants: {
            updateMany: {
              where: { userId },
              data: { status: 'accepted', joinedAt: new Date() },
            },
          },
        },
        include: { participants: true },
      });

      this.userActiveCalls.set(userId, callId);
      const socketSet = this.activeCalls.get(callId) || new Set();
      socketSet.add(socket.id);
      this.activeCalls.set(callId, socketSet);
      socket.join(`call_${callId}`);

      // Clear ringing timeout if at least 2 participants
      const acceptedCount = call.participants.filter((p) => p.status === 'accepted').length;
      if (acceptedCount >= 2) {
        this.clearRingTimeout(callId);
        if (!call.startedAt) {
          await prisma.call.update({
            where: { id: callId },
            data: { startedAt: new Date() },
          });
        }
      }

      // Notify everyone in the call
      this.io.to(`call_${callId}`).emit('call:participant-joined', {
        callId,
        userId,
        userName: joinerUser?.name || 'Unknown',
        userImage: joinerUser?.image || null,
        participantCount: acceptedCount,
      });

      // Send back list of current participants
      const activeParticipants = call.participants
        .filter((p) => p.status === 'accepted')
        .map((p) => ({ userId: p.userId, hasAudio: p.hasAudio, hasVideo: p.hasVideo }));

      socket.emit('call:group-joined', {
        callId,
        roomId: call.roomId,
        callType: call.callType,
        participants: activeParticipants,
      });

      console.log(`📞 ${userId} joined group call ${callId}`);
    } catch (error) {
      console.error('Error joining group call:', error);
      socket.emit('call:error', { message: 'Failed to join group call' });
    }
  }

  private async handleLeaveGroupCall(
    socket: AuthenticatedSocket,
    { callId }: { callId: string },
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    try {
      const leaverUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

      const call = await prisma.call.update({
        where: { id: callId },
        data: {
          participants: {
            updateMany: {
              where: { userId },
              data: { status: 'left', leftAt: new Date() },
            },
          },
        },
        include: { participants: true },
      });

      socket.leave(`call_${callId}`);
      this.userActiveCalls.delete(userId);
      const socketSet = this.activeCalls.get(callId);
      if (socketSet) socketSet.delete(socket.id);

      // Notify others
      this.io.to(`call_${callId}`).emit('call:participant-left', {
        callId,
        userId,
        userName: leaverUser?.name || 'Unknown',
      });

      // Check if call should end (less than 2 active participants)
      const activeCount = call.participants.filter((p) => p.status === 'accepted').length;
      if (activeCount < 2) {
        await this.endGroupCall(callId, 'normal');
      }

      console.log(`📞 ${userId} left group call ${callId}`);
    } catch (error) {
      console.error('Error leaving group call:', error);
    }
  }

  private async handleGroupRingTimeout(callId: string): Promise<void> {
    try {
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: { participants: true },
      });

      if (!call || call.status === 'ongoing') return;

      const acceptedCount = call.participants.filter((p) => p.status === 'accepted').length;
      if (acceptedCount < 2) {
        // Nobody answered, mark as missed
        await prisma.call.update({
          where: { id: callId },
          data: {
            status: 'missed',
            endedAt: new Date(),
            endReason: 'missed',
          },
        });

        this.io.to(`call_${callId}`).emit('call:group-missed', { callId });
        this.cleanupCall(callId);
      }
    } catch (error) {
      console.error('Error handling group ring timeout:', error);
    }
  }

  private async endGroupCall(callId: string, reason: string): Promise<void> {
    try {
      const call = await prisma.call.findUnique({
        where: { id: callId },
      });

      if (!call) return;

      const duration = call.startedAt
        ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
        : 0;

      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'ended',
          endedAt: new Date(),
          endReason: reason as EndReason,
          duration,
        },
      });

      this.io.to(`call_${callId}`).emit('call:group-ended', {
        callId,
        reason,
        duration,
      });

      this.cleanupCall(callId);
    } catch (error) {
      console.error('Error ending group call:', error);
    }
  }

  // ═══════════════════════════════════════
  //  WEBRTC SIGNALING (P2P for 1:1 Calls)
  // ═══════════════════════════════════════

  private handleSignalOffer(
    socket: AuthenticatedSocket,
    { callId, targetUserId, offer }: { callId: string; targetUserId: string; offer: any },
  ): void {
    this.io.to(`call_user_${targetUserId}`).emit('signal:offer', {
      callId,
      fromUserId: socket.user?.userId || socket.user?.id || socket.user?.id,
      offer,
    });
  }

  private handleSignalAnswer(
    socket: AuthenticatedSocket,
    { callId, targetUserId, answer }: { callId: string; targetUserId: string; answer: any },
  ): void {
    this.io.to(`call_user_${targetUserId}`).emit('signal:answer', {
      callId,
      fromUserId: socket.user?.userId || socket.user?.id || socket.user?.id,
      answer,
    });
  }

  private handleIceCandidate(
    socket: AuthenticatedSocket,
    { callId, targetUserId, candidate }: { callId: string; targetUserId: string; candidate: any },
  ): void {
    this.io.to(`call_user_${targetUserId}`).emit('signal:ice-candidate', {
      callId,
      fromUserId: socket.user?.userId || socket.user?.id || socket.user?.id,
      candidate,
    });
  }

  // ═══════════════════════════════════════
  //  MEDIA CONTROLS
  // ═══════════════════════════════════════

  private async handleToggleAudio(
    socket: AuthenticatedSocket,
    { callId, enabled }: { callId: string; enabled: boolean },
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    await prisma.callParticipant.updateMany({
      where: { callId, userId },
      data: { hasAudio: enabled },
    });

    socket.to(`call_${callId}`).emit('call:audio-toggled', {
      callId,
      userId,
      enabled,
    });
  }

  private async handleToggleVideo(
    socket: AuthenticatedSocket,
    { callId, enabled }: { callId: string; enabled: boolean },
  ): Promise<void> {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    await prisma.callParticipant.updateMany({
      where: { callId, userId },
      data: { hasVideo: enabled },
    });

    socket.to(`call_${callId}`).emit('call:video-toggled', {
      callId,
      userId,
      enabled,
    });
  }

  private handleScreenShare(
    socket: AuthenticatedSocket,
    { callId, enabled }: { callId: string; enabled: boolean },
  ): void {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    socket.to(`call_${callId}`).emit('call:screen-share-toggled', {
      callId,
      userId,
      enabled,
    });
  }

  private handleCheckActive(socket: AuthenticatedSocket): void {
    const userId = socket.user?.userId || socket.user?.id || socket.user?.id;
    if (!userId) return;

    const callId = this.userActiveCalls.get(userId);
    socket.emit('call:active-status', { inCall: !!callId, callId: callId || null });
  }

  // ═══════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════

  private async endCallForUser(userId: string, callId: string, reason: string): Promise<void> {
    try {
      const call = await prisma.call.findUnique({
        where: { id: callId },
      });

      if (!call) return;

      const duration = call.startedAt
        ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
        : 0;

      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'ended',
          endedAt: new Date(),
          endReason: reason as EndReason,
          duration,
        },
      });

      this.io.to(`call_${callId}`).emit('call:ended', {
        callId,
        endedBy: userId,
        reason,
        duration,
      });

      // Publish to main backend
      await this.redis.publish('call:events', JSON.stringify({
        event: 'call:ended',
        callId,
        endedBy: userId,
        reason,
        duration,
      }));

      this.cleanupCall(callId);
      console.log(`📞 Call ended: ${callId} by ${userId} (${reason}), duration: ${duration}s`);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  private clearRingTimeout(callId: string): void {
    const timeout = this.ringTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      this.ringTimeouts.delete(callId);
    }
  }

  private cleanupCall(callId: string): void {
    this.clearRingTimeout(callId);

    // Remove user-call mappings
    for (const [userId, cId] of this.userActiveCalls.entries()) {
      if (cId === callId) {
        this.userActiveCalls.delete(userId);
      }
    }

    this.activeCalls.delete(callId);
    this.redis.del(`call:${callId}`).catch(() => {});
  }
}
