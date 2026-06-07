
import logger from "../../../common/utils/logger.js";
import Call from "../model/callModel.js";

/**
 * CallingGateway
 * Handles all real-time calling events via Socket.IO.
 *
 * Registered on the main io server (same /socket.io path).
 * All call events are prefixed with "call:" or "signal:".
 *
 * Flow (1:1):
 *   Caller  → call:initiate        → server creates Call doc, notifies callee
 *   Server  → call:incoming        → callee gets notified
 *   Server  → call:initiated       → caller gets callId confirmed
 *   Callee  → call:accept          → server updates Call, notifies caller
 *   Server  → call:accepted        → caller creates WebRTC offer
 *   Caller  → signal:offer         → server forwards to callee
 *   Callee  → signal:answer        → server forwards to caller
 *   Both    → signal:ice-candidate → server forwards to the other peer
 *   Either  → call:end             → server ends call, notifies both
 *
 * Flow (Group):
 *   Caller  → call:initiate-group  → server creates Call doc, notifies all participants
 *   Others  → call:join-group      → server adds participant, notifies room
 *   Either  → call:leave-group     → server removes participant
 */
export class CallingGateway {
  constructor(io) {
    this.io = io;
    // Track active calls: callId → { callerId, calleeId, participants: Set, roomId }
    this.activeCalls = new Map();
    // Track user → callId for busy detection
    this.userCallMap = new Map();
  }

  /**
   * Called by GatewayManager for every new socket connection
   */
  async handleConnection(socket) {
    const userId = socket.user?.id;
    if (!userId) return;

    // Auto-join user's personal room so we can reach them for incoming calls
    socket.join(`user_${userId}`);

    // Register all call event handlers
    socket.on("call:initiate", (data) => this.handleInitiate(socket, data));
    socket.on("call:accept", (data) => this.handleAccept(socket, data));
    socket.on("call:decline", (data) => this.handleDecline(socket, data));
    socket.on("call:end", (data) => this.handleEnd(socket, data));
    socket.on("call:cancel", (data) => this.handleCancel(socket, data));
    socket.on("call:toggle-audio", (data) => this.handleToggleAudio(socket, data));
    socket.on("call:toggle-video", (data) => this.handleToggleVideo(socket, data));
    socket.on("call:screen-share", (data) => this.handleScreenShare(socket, data));

    // Group call events
    socket.on("call:initiate-group", (data) => this.handleInitiateGroup(socket, data));
    socket.on("call:join-group", (data) => this.handleJoinGroup(socket, data));
    socket.on("call:leave-group", (data) => this.handleLeaveGroup(socket, data));

    // WebRTC signaling — server just forwards, no logic needed
    socket.on("signal:offer", (data) => this.handleSignalOffer(socket, data));
    socket.on("signal:answer", (data) => this.handleSignalAnswer(socket, data));
    socket.on("signal:ice-candidate", (data) => this.handleIceCandidate(socket, data));

    socket.on("disconnect", () => this.handleDisconnect(socket));
  }

  handleDisconnect(socket) {
    const userId = socket.user?.id;
    if (!userId) return;

    // If user was in a call and disconnects, end it
    const callId = this.userCallMap.get(userId);
    if (callId) {
      this._endCallOnDisconnect(callId, userId);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  1:1 CALL FLOW
  // ─────────────────────────────────────────────────────────────────────────

  async handleInitiate(socket, { calleeId, callType, conversationId }) {
    const callerId = socket.user?.id;
    if (!callerId || !calleeId || !conversationId) {
      socket.emit("call:error", { message: "Missing required fields" });
      return;
    }

    try {
      // Check if callee is already in a call (busy)
      if (this.userCallMap.has(calleeId)) {
        socket.emit("call:busy", {
          calleeId,
          message: "User is currently in another call",
        });
        return;
      }

      // Check if caller is already in a call
      if (this.userCallMap.has(callerId)) {
        socket.emit("call:error", { message: "You are already in a call" });
        return;
      }

      // Create call record in DB
      const call = await Call.create({
        callerId,
        calleeId,
        conversationId,
        callType,
        isGroup: false,
        status: "ringing",
        participants: [
          { userId: callerId, status: "joined", joinedAt: new Date(), hasAudio: true, hasVideo: callType === "video" },
          { userId: calleeId, status: "invited" },
        ],
      });

      const callId = call._id.toString();

      // Track in memory
      this.activeCalls.set(callId, {
        callerId,
        calleeId,
        callType,
        conversationId,
        participants: new Set([callerId]),
        isGroup: false,
      });
      this.userCallMap.set(callerId, callId);

      // Join caller to call room
      socket.join(`call_${callId}`);

      // Notify caller — confirmed with callId
      socket.emit("call:initiated", {
        callId,
        calleeId,
        callType,
        conversationId,
      });

      // Notify callee — incoming call
      this.io.to(`user_${calleeId}`).emit("call:incoming", {
        callId,
        callerId,
        callType,
        conversationId,
        isGroup: false,
      });

      // Auto-miss after 45 seconds if not answered
      setTimeout(() => this._autoMiss(callId), 45000);

      logger.info({ callId, callerId, calleeId, callType }, "📞 Call initiated");
    } catch (error) {
      logger.error({ error: error.message }, "Error initiating call");
      socket.emit("call:error", { message: "Failed to initiate call" });
    }
  }

  async handleAccept(socket, { callId }) {
    const calleeId = socket.user?.id;
    if (!calleeId || !callId) return;

    try {
      const call = await Call.findByIdAndUpdate(
        callId,
        { status: "accepted", "participants.$[p].status": "joined", "participants.$[p].joinedAt": new Date() },
        { arrayFilters: [{ "p.userId": calleeId }], new: true }
      );

      if (!call) {
        socket.emit("call:error", { message: "Call not found" });
        return;
      }

      // Check if call was already cancelled/ended
      if (["cancelled", "ended", "declined"].includes(call.status)) {
        socket.emit("call:error", { message: "Call is no longer available" });
        return;
      }

      const callMeta = this.activeCalls.get(callId);
      if (callMeta) {
        callMeta.participants.add(calleeId);
        this.userCallMap.set(calleeId, callId);
      }

      // Join callee to call room
      socket.join(`call_${callId}`);

      // Notify caller — callee accepted, now caller creates WebRTC offer
      this.io.to(`call_${callId}`).emit("call:accepted", {
        callId,
        acceptedBy: calleeId,
        callType: call.callType,
      });

      logger.info({ callId, calleeId }, "📞 Call accepted");
    } catch (error) {
      logger.error({ error: error.message }, "Error accepting call");
      socket.emit("call:error", { message: "Failed to accept call" });
    }
  }

  async handleDecline(socket, { callId }) {
    const calleeId = socket.user?.id;
    if (!calleeId || !callId) return;

    try {
      await Call.findByIdAndUpdate(callId, {
        status: "declined",
        endedAt: new Date(),
        endReason: "declined",
        "participants.$[p].status": "declined",
      }, { arrayFilters: [{ "p.userId": calleeId }] });

      const callMeta = this.activeCalls.get(callId);
      if (callMeta) {
        // Notify caller
        this.io.to(`user_${callMeta.callerId}`).emit("call:declined", {
          callId,
          declinedBy: calleeId,
        });
        this._cleanupCall(callId);
      }

      logger.info({ callId, calleeId }, "📞 Call declined");
    } catch (error) {
      logger.error({ error: error.message }, "Error declining call");
    }
  }

  async handleEnd(socket, { callId }) {
    const userId = socket.user?.id;
    if (!userId || !callId) return;

    try {
      const call = await Call.findById(callId);
      if (!call) return;

      const duration = call.startedAt
        ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
        : 0;

      await Call.findByIdAndUpdate(callId, {
        status: "ended",
        endedAt: new Date(),
        duration,
        endReason: "normal",
      });

      // Notify everyone in call room
      this.io.to(`call_${callId}`).emit("call:ended", {
        callId,
        endedBy: userId,
        reason: "normal",
        duration,
      });

      this._cleanupCall(callId);
      logger.info({ callId, userId, duration }, "📞 Call ended");
    } catch (error) {
      logger.error({ error: error.message }, "Error ending call");
    }
  }

  async handleCancel(socket, { callId }) {
    const callerId = socket.user?.id;
    if (!callerId || !callId) return;

    try {
      const callMeta = this.activeCalls.get(callId);

      await Call.findByIdAndUpdate(callId, {
        status: "cancelled",
        endedAt: new Date(),
        endReason: "cancelled",
      });

      if (callMeta) {
        // Notify callee that caller cancelled
        this.io.to(`user_${callMeta.calleeId}`).emit("call:cancelled", {
          callId,
          cancelledBy: callerId,
        });
        this._cleanupCall(callId);
      }

      logger.info({ callId, callerId }, "📞 Call cancelled");
    } catch (error) {
      logger.error({ error: error.message }, "Error cancelling call");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  GROUP CALL FLOW
  // ─────────────────────────────────────────────────────────────────────────

  async handleInitiateGroup(socket, { conversationId, callType, participantIds }) {
    const callerId = socket.user?.id;
    if (!callerId || !conversationId || !participantIds?.length) {
      socket.emit("call:error", { message: "Missing required fields for group call" });
      return;
    }

    try {
      const roomId = `group_call_${conversationId}_${Date.now()}`;

      const participants = [
        { userId: callerId, status: "joined", joinedAt: new Date(), hasAudio: true, hasVideo: callType === "video" },
        ...participantIds
          .filter((id) => id !== callerId)
          .map((id) => ({ userId: id, status: "invited" })),
      ];

      const call = await Call.create({
        callerId,
        conversationId,
        callType,
        isGroup: true,
        status: "ringing",
        roomId,
        participants,
      });

      const callId = call._id.toString();

      this.activeCalls.set(callId, {
        callerId,
        conversationId,
        callType,
        roomId,
        participants: new Set([callerId]),
        isGroup: true,
      });
      this.userCallMap.set(callerId, callId);

      socket.join(`call_${callId}`);

      // Notify caller
      socket.emit("call:group-initiated", {
        callId,
        roomId,
        callType,
        conversationId,
        participantIds,
      });

      // Notify all other participants
      participantIds
        .filter((id) => id !== callerId)
        .forEach((participantId) => {
          this.io.to(`user_${participantId}`).emit("call:incoming-group", {
            callId,
            callerId,
            callType,
            conversationId,
            roomId,
            isGroup: true,
          });
        });

      // Auto-miss after 45 seconds
      setTimeout(() => this._autoMissGroup(callId), 45000);

      logger.info({ callId, callerId, conversationId, callType }, "👥 Group call initiated");
    } catch (error) {
      logger.error({ error: error.message }, "Error initiating group call");
      socket.emit("call:error", { message: "Failed to initiate group call" });
    }
  }

  async handleJoinGroup(socket, { callId }) {
    const userId = socket.user?.id;
    if (!userId || !callId) return;

    try {
      const call = await Call.findByIdAndUpdate(
        callId,
        {
          "participants.$[p].status": "joined",
          "participants.$[p].joinedAt": new Date(),
        },
        { arrayFilters: [{ "p.userId": userId }], new: true }
      ).populate("participants.userId", "name image");

      if (!call) {
        socket.emit("call:error", { message: "Group call not found" });
        return;
      }

      const callMeta = this.activeCalls.get(callId);
      if (callMeta) {
        callMeta.participants.add(userId);
        this.userCallMap.set(userId, callId);
      }

      socket.join(`call_${callId}`);

      // Build current participants list for the joining user
      const joinedParticipants = call.participants
        .filter((p) => p.status === "joined")
        .map((p) => ({
          userId: p.userId._id || p.userId,
          userName: p.userId.name,
          userImage: p.userId.image,
          hasAudio: p.hasAudio,
          hasVideo: p.hasVideo,
        }));

      // Tell joining user about current participants
      socket.emit("call:group-joined", {
        callId,
        roomId: call.roomId,
        callType: call.callType,
        participants: joinedParticipants,
      });

      // Tell everyone else someone joined
      socket.to(`call_${callId}`).emit("call:participant-joined", {
        callId,
        userId,
      });

      logger.info({ callId, userId }, "👥 User joined group call");
    } catch (error) {
      logger.error({ error: error.message }, "Error joining group call");
      socket.emit("call:error", { message: "Failed to join group call" });
    }
  }

  async handleLeaveGroup(socket, { callId }) {
    const userId = socket.user?.id;
    if (!userId || !callId) return;

    try {
      await Call.findByIdAndUpdate(
        callId,
        {
          "participants.$[p].status": "left",
          "participants.$[p].leftAt": new Date(),
        },
        { arrayFilters: [{ "p.userId": userId }] }
      );

      const callMeta = this.activeCalls.get(callId);
      if (callMeta) {
        callMeta.participants.delete(userId);
        this.userCallMap.delete(userId);

        socket.leave(`call_${callId}`);

        // Notify others
        this.io.to(`call_${callId}`).emit("call:participant-left", {
          callId,
          userId,
        });

        // If no participants left, end the group call
        if (callMeta.participants.size === 0) {
          await Call.findByIdAndUpdate(callId, {
            status: "ended",
            endedAt: new Date(),
            endReason: "normal",
          });
          this.io.to(`call_${callId}`).emit("call:group-ended", {
            callId,
            reason: "empty",
          });
          this._cleanupCall(callId);
        }
      }

      logger.info({ callId, userId }, "👥 User left group call");
    } catch (error) {
      logger.error({ error: error.message }, "Error leaving group call");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MEDIA TOGGLE EVENTS — forward to call room
  // ─────────────────────────────────────────────────────────────────────────

  handleToggleAudio(socket, { callId, enabled }) {
    const userId = socket.user?.id;
    socket.to(`call_${callId}`).emit("call:audio-toggled", { userId, enabled });
  }

  handleToggleVideo(socket, { callId, enabled }) {
    const userId = socket.user?.id;
    socket.to(`call_${callId}`).emit("call:video-toggled", { userId, enabled });
  }

  handleScreenShare(socket, { callId, enabled }) {
    const userId = socket.user?.id;
    socket.to(`call_${callId}`).emit("call:screen-share-toggled", { userId, enabled });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WEBRTC SIGNALING — just forward to the target user, no logic
  // ─────────────────────────────────────────────────────────────────────────

  handleSignalOffer(socket, { callId, targetUserId, offer }) {
    const fromUserId = socket.user?.id;
    this.io.to(`user_${targetUserId}`).emit("signal:offer", {
      callId,
      fromUserId,
      offer,
    });
  }

  handleSignalAnswer(socket, { callId, targetUserId, answer }) {
    const fromUserId = socket.user?.id;
    this.io.to(`user_${targetUserId}`).emit("signal:answer", {
      callId,
      fromUserId,
      answer,
    });
  }

  handleIceCandidate(socket, { callId, targetUserId, candidate }) {
    const fromUserId = socket.user?.id;
    this.io.to(`user_${targetUserId}`).emit("signal:ice-candidate", {
      callId,
      fromUserId,
      candidate,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  async _autoMiss(callId) {
    const callMeta = this.activeCalls.get(callId);
    if (!callMeta) return; // already answered/cancelled

    try {
      const call = await Call.findById(callId);
      if (!call || !["ringing", "initiated"].includes(call.status)) return;

      await Call.findByIdAndUpdate(callId, {
        status: "missed",
        endedAt: new Date(),
        endReason: "missed",
      });

      // Notify caller
      this.io.to(`user_${callMeta.callerId}`).emit("call:missed", {
        callId,
        type: "no_answer",
      });

      // Notify callee (so they can show missed call)
      this.io.to(`user_${callMeta.calleeId}`).emit("call:missed", {
        callId,
        type: "missed",
      });

      this._cleanupCall(callId);
      logger.info({ callId }, "📞 Call auto-missed (no answer)");
    } catch (error) {
      logger.error({ error: error.message }, "Error auto-missing call");
    }
  }

  async _autoMissGroup(callId) {
    const callMeta = this.activeCalls.get(callId);
    if (!callMeta) return;

    try {
      const call = await Call.findById(callId);
      if (!call || call.status !== "ringing") return;

      // Only end if nobody else joined
      if (callMeta.participants.size <= 1) {
        await Call.findByIdAndUpdate(callId, {
          status: "missed",
          endedAt: new Date(),
          endReason: "missed",
        });

        this.io.to(`call_${callId}`).emit("call:group-missed", { callId });
        this._cleanupCall(callId);
      }
    } catch (error) {
      logger.error({ error: error.message }, "Error auto-missing group call");
    }
  }

  async _endCallOnDisconnect(callId, userId) {
    const callMeta = this.activeCalls.get(callId);
    if (!callMeta) return;

    try {
      if (callMeta.isGroup) {
        callMeta.participants.delete(userId);
        this.userCallMap.delete(userId);

        this.io.to(`call_${callId}`).emit("call:participant-left", { callId, userId });

        if (callMeta.participants.size === 0) {
          await Call.findByIdAndUpdate(callId, { status: "ended", endedAt: new Date(), endReason: "normal" });
          this.io.to(`call_${callId}`).emit("call:group-ended", { callId, reason: "empty" });
          this._cleanupCall(callId);
        }
      } else {
        // 1:1 — if either party disconnects, end call
        await Call.findByIdAndUpdate(callId, { status: "ended", endedAt: new Date(), endReason: "failed" });
        this.io.to(`call_${callId}`).emit("call:ended", { callId, endedBy: userId, reason: "disconnected" });
        this._cleanupCall(callId);
      }
    } catch (error) {
      logger.error({ error: error.message }, "Error ending call on disconnect");
    }
  }

  _cleanupCall(callId) {
    const callMeta = this.activeCalls.get(callId);
    if (callMeta) {
      // Remove all users from userCallMap
      callMeta.participants.forEach((userId) => {
        this.userCallMap.delete(userId);
      });
      if (callMeta.callerId) this.userCallMap.delete(callMeta.callerId);
      if (callMeta.calleeId) this.userCallMap.delete(callMeta.calleeId);
      this.activeCalls.delete(callId);
    }
  }
}
