/**
 * CallingGateway — with LiveKit SFU integration
 *
 * Flow:
 *   1. Caller emits call:initiate → server creates Call in DB + LiveKit room
 *   2. Callee gets call:incoming notification
 *   3. Callee emits call:accept → server generates LiveKit tokens for BOTH
 *   4. Both receive call:accepted with their LiveKit token
 *   5. Both join LiveKit room directly — media flows through LiveKit SFU
 *   6. No WebRTC signaling needed — LiveKit handles everything
 *
 * For group calls:
 *   1. Caller emits call:initiate-group → server creates Call + LiveKit room
 *   2. All participants get call:incoming-group with callId
 *   3. Each participant emits call:join-group → server generates their token
 *   4. Each participant gets call:group-joined with their LiveKit token
 *   5. All join the same LiveKit room — SFU handles 50 people easily
 */

import Call from "../models/callModel.js";
import {
  createRoom,
  generateToken,
  deleteRoom,
  listParticipants,
} from "../livekit/livekit.service.js";
import logger from "../../../common/utils/logger.js";

export class CallingGateway {
  constructor(io) {
    this.io = io;
    // callId → { callerId, calleeId, participants: Set, isGroup, conversationId }
    this.activeCalls = new Map();
    // userId → callId (for busy detection)
    this.userCallMap = new Map();
  }

  async handleConnection(socket) {
    const userId = socket.user?.id;
    if (!userId) return;

    socket.join(`user_${userId}`);

    // 1:1 call events
    socket.on("call:initiate", (data) => this.handleInitiate(socket, data));
    socket.on("call:accept", (data) => this.handleAccept(socket, data));
    socket.on("call:decline", (data) => this.handleDecline(socket, data));
    socket.on("call:end", (data) => this.handleEnd(socket, data));
    socket.on("call:cancel", (data) => this.handleCancel(socket, data));

    // Group call events
    socket.on("call:initiate-group", (data) =>
      this.handleInitiateGroup(socket, data),
    );
    socket.on("call:join-group", (data) => this.handleJoinGroup(socket, data));
    socket.on("call:leave-group", (data) =>
      this.handleLeaveGroup(socket, data),
    );

    // Media toggle events (still useful for UI state sync)
    socket.on("call:toggle-audio", (data) =>
      this.handleToggleAudio(socket, data),
    );
    socket.on("call:toggle-video", (data) =>
      this.handleToggleVideo(socket, data),
    );
    socket.on("call:screen-share", (data) =>
      this.handleScreenShare(socket, data),
    );

    socket.on("disconnect", () => this.handleDisconnect(socket));
  }

  handleDisconnect(socket) {
    const userId = socket.user?.id;
    if (!userId) return;
    const callId = this.userCallMap.get(userId);
    if (callId) this._endCallOnDisconnect(callId, userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  1:1 CALL
  // ─────────────────────────────────────────────────────────────────────────

  async handleInitiate(socket, { calleeId, callType, conversationId }) {
    const callerId = socket.user?.id;
    const callerName = socket.user?.name || callerId;

    if (!callerId || !calleeId || !conversationId) {
      socket.emit("call:error", { message: "Missing required fields" });
      return;
    }

    try {
      // Busy check
      if (this.userCallMap.has(calleeId)) {
        socket.emit("call:busy", {
          calleeId,
          message: "User is in another call",
        });
        return;
      }
      if (this.userCallMap.has(callerId)) {
        socket.emit("call:error", { message: "You are already in a call" });
        return;
      }

      // Create DB record
      const call = await Call.create({
        callerId,
        calleeId,
        conversationId,
        callType,
        isGroup: false,
        status: "ringing",
        participants: [
          {
            userId: callerId,
            status: "joined",
            joinedAt: new Date(),
            hasAudio: true,
            hasVideo: callType === "video",
          },
          { userId: calleeId, status: "invited" },
        ],
      });

      const callId = call._id.toString();

      // Create LiveKit room (named after callId)
      await createRoom(callId, {
        maxParticipants: 2,
        emptyTimeoutSeconds: 120,
      });

      // Track in memory
      this.activeCalls.set(callId, {
        callerId,
        calleeId,
        callType,
        conversationId,
        isGroup: false,
        callerName,
        participants: new Set([callerId]),
      });
      this.userCallMap.set(callerId, callId);

      socket.join(`call_${callId}`);

      // Confirm to caller
      socket.emit("call:initiated", {
        callId,
        calleeId,
        callType,
        conversationId,
      });

      // Notify callee
      this.io.to(`user_${calleeId}`).emit("call:incoming", {
        callId,
        callerId,
        callerName,
        callType,
        conversationId,
        isGroup: false,
      });

      // Auto-miss after 45 seconds
      setTimeout(() => this._autoMiss(callId), 45000);

      logger.info({ callId, callerId, calleeId }, "📞 1:1 call initiated");
    } catch (error) {
      logger.error({ error: error.message }, "Error initiating call");
      socket.emit("call:error", { message: "Failed to initiate call" });
    }
  }

  async handleAccept(socket, { callId }) {
    const calleeId = socket.user?.id;
    const calleeName = socket.user?.name || calleeId;
    if (!calleeId || !callId) return;

    try {
      const call = await Call.findByIdAndUpdate(
        callId,
        {
          status: "accepted",
          startedAt: new Date(),
          "participants.$[p].status": "joined",
          "participants.$[p].joinedAt": new Date(),
        },
        { arrayFilters: [{ "p.userId": calleeId }], new: true },
      );

      if (!call || ["cancelled", "ended", "declined"].includes(call.status)) {
        socket.emit("call:error", { message: "Call is no longer available" });
        return;
      }

      const callMeta = this.activeCalls.get(callId);
      if (!callMeta) {
        socket.emit("call:error", { message: "Call not found" });
        return;
      }

      callMeta.participants.add(calleeId);
      this.userCallMap.set(calleeId, callId);
      socket.join(`call_${callId}`);

      // Generate LiveKit tokens for BOTH caller and callee
      const [callerToken, calleeToken] = await Promise.all([
        generateToken(callId, callMeta.callerId, callMeta.callerName),
        generateToken(callId, calleeId, calleeName),
      ]);

      const livekitUrl = process.env.LIVEKIT_PUBLIC_URL || process.env.LIVEKIT_URL;

      // Send caller their token
      this.io.to(`user_${callMeta.callerId}`).emit("call:accepted", {
        callId,
        acceptedBy: calleeId,
        callType: call.callType,
        // LiveKit connection info — caller uses this to join the room
        livekit: {
          url: livekitUrl,
          token: callerToken,
          roomName: callId,
        },
      });

      // Send callee their token
      socket.emit("call:accepted", {
        callId,
        acceptedBy: calleeId,
        callType: call.callType,
        // LiveKit connection info — callee uses this to join the room
        livekit: {
          url: livekitUrl,
          token: calleeToken,
          roomName: callId,
        },
      });

      logger.info(
        { callId, calleeId },
        "📞 Call accepted, LiveKit tokens sent",
      );
    } catch (error) {
      logger.error({ error: error.message }, "Error accepting call");
      socket.emit("call:error", { message: "Failed to accept call" });
    }
  }

  async handleDecline(socket, { callId }) {
    const calleeId = socket.user?.id;
    if (!calleeId || !callId) return;

    try {
      await Call.findByIdAndUpdate(
        callId,
        {
          status: "declined",
          endedAt: new Date(),
          endReason: "declined",
          "participants.$[p].status": "declined",
        },
        { arrayFilters: [{ "p.userId": calleeId }] },
      );

      const callMeta = this.activeCalls.get(callId);
      if (callMeta) {
        this.io
          .to(`user_${callMeta.callerId}`)
          .emit("call:declined", { callId, declinedBy: calleeId });
        await deleteRoom(callId);
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

      // Delete LiveKit room — kicks all participants
      await deleteRoom(callId);
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
    const call = await Call.findByIdAndUpdate(callId, {
      status: "cancelled",
      endedAt: new Date(),
      endReason: "cancelled",
    });

    const callMeta = this.activeCalls.get(callId);
    if (callMeta) {
      if (callMeta.isGroup) {
        // Group call — notify ALL invited participants
        const dbCall = await Call.findById(callId);
        if (dbCall) {
          dbCall.participants
            .filter(p => p.userId.toString() !== callerId)
            .forEach(p => {
              this.io.to(`user_${p.userId}`).emit("call:cancelled", {
                callId,
                cancelledBy: callerId,
              });
            });
        }
      } else {
        // 1:1 call — notify callee
        this.io.to(`user_${callMeta.calleeId}`).emit("call:cancelled", {
          callId,
          cancelledBy: callerId,
        });
      }

      // Always notify caller so their UI closes
      socket.emit("call:ended", {
        callId,
        endedBy: callerId,
        reason: "cancelled",
        duration: 0,
      });

      await deleteRoom(callId);
      this._cleanupCall(callId);
    }

    logger.info({ callId, callerId }, "📞 Call cancelled");
  } catch (error) {
    logger.error({ error: error.message }, "Error cancelling call");
  }
}

  // ─────────────────────────────────────────────────────────────────────────
  //  GROUP CALL
  // ─────────────────────────────────────────────────────────────────────────

  async handleInitiateGroup(
    socket,
    { conversationId, callType, participantIds },
  ) {
    const callerId = socket.user?.id;
    const callerName = socket.user?.name || callerId;
    if (!callerId || !conversationId || !participantIds?.length) {
      socket.emit("call:error", {
        message: "Missing required fields for group call",
      });
      return;
    }

    try {
      const participants = [
        {
          userId: callerId,
          status: "joined",
          joinedAt: new Date(),
          hasAudio: true,
          hasVideo: callType === "video",
        },
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
        participants,
      });

      const callId = call._id.toString();

      // Create LiveKit room — up to 50 participants
      await createRoom(callId, {
        maxParticipants: 50,
        emptyTimeoutSeconds: 300,
      });

      this.activeCalls.set(callId, {
        callerId,
        conversationId,
        callType,
        isGroup: true,
        callerName,
        participants: new Set([callerId]),
      });
      this.userCallMap.set(callerId, callId);
      socket.join(`call_${callId}`);

      // Generate token for caller immediately so they can join
      const callerToken = await generateToken(callId, callerId, callerName);

      socket.emit("call:group-initiated", {
        callId,
        callType,
        conversationId,
        participantIds,
        // Caller joins LiveKit room right away
        livekit: {
          url: process.env.LIVEKIT_URL,
          token: callerToken,
          roomName: callId,
        },
      });

      // Notify all other participants
      participantIds
        .filter((id) => id !== callerId)
        .forEach((participantId) => {
          this.io.to(`user_${participantId}`).emit("call:incoming-group", {
            callId,
            callerId,
            callerName,
            callType,
            conversationId,
            isGroup: true,
          });
        });

      // Auto-miss after 45 seconds if nobody joins
      setTimeout(() => this._autoMissGroup(callId), 45000);

      logger.info(
        { callId, callerId, conversationId },
        "👥 Group call initiated",
      );
    } catch (error) {
      logger.error({ error: error.message }, "Error initiating group call");
      socket.emit("call:error", { message: "Failed to initiate group call" });
    }
  }

  async handleJoinGroup(socket, { callId }) {
    const userId = socket.user?.id;
    const userName = socket.user?.name || userId;
    if (!userId || !callId) return;

    try {
      const call = await Call.findByIdAndUpdate(
        callId,
        {
          "participants.$[p].status": "joined",
          "participants.$[p].joinedAt": new Date(),
        },
        { arrayFilters: [{ "p.userId": userId }], new: true },
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

      // Generate LiveKit token for this participant
      const token = await generateToken(callId, userId, userName);

      // Current participants list for the joining user
      const joinedParticipants = call.participants
        .filter((p) => p.status === "joined")
        .map((p) => ({
          userId: p.userId._id?.toString() || p.userId.toString(),
          userName: p.userId.name,
          userImage: p.userId.image,
          hasAudio: p.hasAudio,
          hasVideo: p.hasVideo,
        }));

      // Tell joining user: here's your token + who's already there
      socket.emit("call:group-joined", {
        callId,
        callType: call.callType,
        participants: joinedParticipants,
        // LiveKit token — frontend joins the room with this
        livekit: {
          url: process.env.LIVEKIT_URL,
          token,
          roomName: callId,
        },
      });

      // Tell everyone else someone joined
      socket.to(`call_${callId}`).emit("call:participant-joined", {
        callId,
        userId,
        userName,
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
        { arrayFilters: [{ "p.userId": userId }] },
      );

      const callMeta = this.activeCalls.get(callId);
      if (callMeta) {
        callMeta.participants.delete(userId);
        this.userCallMap.delete(userId);
        socket.leave(`call_${callId}`);

        this.io
          .to(`call_${callId}`)
          .emit("call:participant-left", { callId, userId });

        // End call if last person left
        if (callMeta.participants.size === 0) {
          await Call.findByIdAndUpdate(callId, {
            status: "ended",
            endedAt: new Date(),
            endReason: "normal",
          });
          this.io
            .to(`call_${callId}`)
            .emit("call:group-ended", { callId, reason: "empty" });
          await deleteRoom(callId);
          this._cleanupCall(callId);
        }
      }

      logger.info({ callId, userId }, "👥 User left group call");
    } catch (error) {
      logger.error({ error: error.message }, "Error leaving group call");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MEDIA TOGGLES — UI state sync only (LiveKit handles actual media)
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
    socket
      .to(`call_${callId}`)
      .emit("call:screen-share-toggled", { userId, enabled });
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

      this.io
        .to(`user_${callMeta.callerId}`)
        .emit("call:missed", { callId, type: "no_answer" });
      this.io
        .to(`user_${callMeta.calleeId}`)
        .emit("call:missed", { callId, type: "missed" });

      await deleteRoom(callId);
      this._cleanupCall(callId);
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

      if (callMeta.participants.size <= 1) {
        await Call.findByIdAndUpdate(callId, {
          status: "missed",
          endedAt: new Date(),
          endReason: "missed",
        });
        this.io.to(`call_${callId}`).emit("call:group-missed", { callId });
        await deleteRoom(callId);
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
        this.io
          .to(`call_${callId}`)
          .emit("call:participant-left", { callId, userId });

        if (callMeta.participants.size === 0) {
          await Call.findByIdAndUpdate(callId, {
            status: "ended",
            endedAt: new Date(),
            endReason: "normal",
          });
          this.io
            .to(`call_${callId}`)
            .emit("call:group-ended", { callId, reason: "empty" });
          await deleteRoom(callId);
          this._cleanupCall(callId);
        }
      } else {
        await Call.findByIdAndUpdate(callId, {
          status: "ended",
          endedAt: new Date(),
          endReason: "failed",
        });
        this.io
          .to(`call_${callId}`)
          .emit("call:ended", {
            callId,
            endedBy: userId,
            reason: "disconnected",
          });
        await deleteRoom(callId);
        this._cleanupCall(callId);
      }
    } catch (error) {
      logger.error({ error: error.message }, "Error ending call on disconnect");
    }
  }

  _cleanupCall(callId) {
    const callMeta = this.activeCalls.get(callId);
    if (callMeta) {
      callMeta.participants.forEach((uid) => this.userCallMap.delete(uid));
      if (callMeta.callerId) this.userCallMap.delete(callMeta.callerId);
      if (callMeta.calleeId) this.userCallMap.delete(callMeta.calleeId);
      this.activeCalls.delete(callId);
    }
  }
}
