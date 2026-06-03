/**
 * Alertness Gateway
 * Handles alertness session WebSocket events
 * 
 * Events:
 * - startAlertnessSession - Start alertness session
 * - endAlertnessSession - End alertness session
 * - joinClass - Join class room
 * - leaveClass - Leave class room
 */

import logger from "../../common/utils/logger.js";
import AlertnessSession from "./models/alertnessSessionModel.js";

export class AlertnessGateway {
  constructor(io) {
    this.io = io;
    this.activeSessions = new Map(); // sessionId -> session data
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    // Frontend event handlers
    socket.on("startAlertnessSession", this.handleStartAlertnessSession.bind(this, socket));
    socket.on("endAlertnessSession", this.handleEndAlertnessSession.bind(this, socket));
    socket.on("joinClass", this.handleJoinClass.bind(this, socket));
    socket.on("leaveClass", this.handleLeaveClass.bind(this, socket));
    
    // Legacy event handlers (backward compatibility)
    socket.on("alertness:start", this.handleStartSession.bind(this, socket));
    socket.on("alertness:update", this.handleUpdateSession.bind(this, socket));
    socket.on("alertness:complete", this.handleCompleteSession.bind(this, socket));
    socket.on("alertness:join", this.handleJoinSession.bind(this, socket));
  }

  /**
   * Handle join class room
   */
  handleJoinClass(socket, classId) {
    const roomId = String(classId);
    socket.join(roomId);
    logger.info({ 
      socketId: socket.id, 
      userId: socket.user?.id,
      classId: roomId 
    }, "User joined class room");
  }

  /**
   * Handle leave class room
   */
  handleLeaveClass(socket, classId) {
    const roomId = String(classId);
    socket.leave(roomId);
    logger.info({ 
      socketId: socket.id, 
      userId: socket.user?.id,
      classId: roomId 
    }, "User left class room");
  }

  /**
   * Handle start alertness session (frontend event)
   */
  async handleStartAlertnessSession(socket, sessionData, callback) {
    try {
      const { classId, duration, startedBy } = sessionData;
      const roomId = String(classId);
      
      // Check if there's already an active session
      const existingSession = await AlertnessSession.findOne({
        classId,
        isActive: true
      });

      if (existingSession) {
        if (callback) {
          callback({ error: "There is already an active session" });
        }
        return;
      }

      // Create new session
      const session = new AlertnessSession({
        classId,
        duration,
        startedBy: socket.user?.id,
        startTime: new Date(),
        isActive: true
      });

      await session.save();

      // Schedule auto-end
      setTimeout(async () => {
        try {
          const sessionToEnd = await AlertnessSession.findById(session._id);
          if (sessionToEnd && sessionToEnd.isActive) {
            sessionToEnd.isActive = false;
            sessionToEnd.endTime = new Date();
            await sessionToEnd.save();

            // Emit session ended
            this.io.to(roomId).emit("alertnessSessionEnded", {
              sessionId: session._id,
              classId
            });
          }
        } catch (error) {
          logger.error({ error, sessionId: session._id }, "Error auto-ending session");
        }
      }, duration);

      // Broadcast session started
      this.io.to(roomId).emit("alertnessSessionStarted", {
        sessionId: session._id,
        classId,
        duration,
        startedBy
      });

      // Send success callback
      if (callback) {
        callback({ success: true, sessionId: session._id });
      }

      logger.info({ 
        socketId: socket.id, 
        sessionId: session._id,
        classId,
        roomId,
        startedBy 
      }, "Alertness session started");
    } catch (error) {
      logger.error({ error, sessionData }, "Error starting alertness session");
      if (callback) {
        callback({ error: "Failed to start session" });
      }
    }
  }

  /**
   * Handle end alertness session (frontend event)
   */
  async handleEndAlertnessSession(socket, { classId }, callback) {
    try {
      const roomId = String(classId);
      const session = await AlertnessSession.findOne({
        classId,
        isActive: true
      });

      if (!session) {
        if (callback) {
          callback({ error: "No active session found" });
        }
        return;
      }

      session.isActive = false;
      session.endTime = new Date();
      await session.save();

      // Broadcast session ended
      this.io.to(roomId).emit("alertnessSessionEnded", {
        sessionId: session._id,
        classId
      });

      // Send success callback
      if (callback) {
        callback({ success: true });
      }

      logger.info({ 
        socketId: socket.id, 
        sessionId: session._id,
        classId,
        roomId 
      }, "Alertness session ended");
    } catch (error) {
      logger.error({ error, classId }, "Error ending alertness session");
      if (callback) {
        callback({ error: "Failed to end session" });
      }
    }
  }

  /**
   * Handle start alertness session
   */
  handleStartSession(socket, sessionData) {
    const { sessionId, conversationId, startedBy } = sessionData;
    
    // Store session
    this.activeSessions.set(sessionId, {
      ...sessionData,
      startedAt: new Date(),
      participants: new Set([startedBy])
    });
    
    // Broadcast to conversation
    this.io.to(`conv:${conversationId}`).emit("alertness:started", sessionData);
    
    logger.info({ 
      socketId: socket.id, 
      sessionId,
      conversationId,
      startedBy
    }, "Alertness session started");
  }

  /**
   * Handle update alertness session
   */
  handleUpdateSession(socket, updateData) {
    const { sessionId, userId, status } = updateData;
    
    if (!this.activeSessions.has(sessionId)) {
      socket.emit("alertness:error", {
        message: "Session not found",
        sessionId
      });
      return;
    }
    
    const session = this.activeSessions.get(sessionId);
    session.participants.add(userId);
    
    // Broadcast update to conversation
    this.io.to(`conv:${session.conversationId}`).emit("alertness:updated", {
      sessionId,
      userId,
      status,
      totalParticipants: session.participants.size
    });
    
    logger.debug({ 
      sessionId,
      userId,
      status
    }, "Alertness session updated");
  }

  /**
   * Handle complete alertness session
   */
  handleCompleteSession(socket, { sessionId }) {
    if (!this.activeSessions.has(sessionId)) {
      socket.emit("alertness:error", {
        message: "Session not found",
        sessionId
      });
      return;
    }
    
    const session = this.activeSessions.get(sessionId);
    
    // Broadcast completion
    this.io.to(`conv:${session.conversationId}`).emit("alertness:completed", {
      sessionId,
      totalParticipants: session.participants.size,
      duration: Date.now() - session.startedAt
    });
    
    // Remove session
    this.activeSessions.delete(sessionId);
    
    logger.info({ 
      sessionId,
      conversationId: session.conversationId
    }, "Alertness session completed");
  }

  /**
   * Handle join alertness session
   */
  handleJoinSession(socket, { sessionId }) {
    const userId = socket.user?.id;
    
    if (!this.activeSessions.has(sessionId)) {
      socket.emit("alertness:error", {
        message: "Session not found",
        sessionId
      });
      return;
    }
    
    const session = this.activeSessions.get(sessionId);
    session.participants.add(userId);
    
    socket.emit("alertness:joined", {
      sessionId,
      session: {
        ...session,
        participants: Array.from(session.participants)
      }
    });
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    // Clean up user from active sessions if needed
    logger.debug({ 
      socketId: socket.id, 
      reason 
    }, "Alertness gateway disconnect");
  }
}
