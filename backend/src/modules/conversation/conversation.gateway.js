/**
 * Conversation Gateway
 * Handles all conversation-related WebSocket events
 * 
 * Events:
 * - conversation:join - Join a conversation
 * - conversation:leave - Leave a conversation
 * - conversation:active-users - Get active users in conversation
 * - conversation:update - Conversation updated
 */

import logger from "../../common/utils/logger.js";

export class ConversationGateway {
  constructor(io) {
    this.io = io;
    this.activeUsers = new Map(); // conversationId -> Map of userId -> user data
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    // Frontend uses these events
    socket.on("joinRoom", this.handleJoinConversation.bind(this, socket));
    socket.on("leaveRoom", this.handleLeaveConversation.bind(this, socket));
    
    // Legacy event names for backward compatibility
    socket.on("join:conversation", this.handleJoinConversation.bind(this, socket));
    socket.on("conversation:join", this.handleJoinConversation.bind(this, socket));
    
    socket.on("leave:conversation", this.handleLeaveConversation.bind(this, socket));
    socket.on("conversation:leave", this.handleLeaveConversation.bind(this, socket));
    
    socket.on("conversation:getActiveUsers", this.handleGetActiveUsers.bind(this, socket));
    socket.on("conversation:active-users", this.handleGetActiveUsers.bind(this, socket));
    
    // Handle reset unread request count
    socket.on("reset_unread_request", this.handleResetUnreadRequest.bind(this, socket));
  }

  /**
   * Handle join conversation
   */
  async handleJoinConversation(socket, conversationId) {
    const userId = socket.user?.id;

    // Guard: conversationId must be a non-empty string
    if (!conversationId || typeof conversationId !== 'string') {
      logger.warn({ userId, conversationId }, 'handleJoinConversation: invalid conversationId, ignoring');
      return;
    }

    try {
      socket.join(`conv:${conversationId}`);

      // Ensure the inner Map always exists before any code path that reads it
      if (!this.activeUsers.has(conversationId)) {
        this.activeUsers.set(conversationId, new Map());
      }

      // Store full user data
      const userData = {
        _id: socket.user?.id,
        name: socket.user?.name,
        email: socket.user?.email,
        image: socket.user?.image
      };

      this.activeUsers.get(conversationId).set(userId, userData);
    
    // Auto-mark attendance if there's an active session
    try {
      const Conversation = (await import('../../common/models/conversationModel.js')).default;
      const Session = (await import('../../common/models/sessionModel.js')).default;
      const AttendanceLog = (await import('../attendance/models/attendanceLogModel.js')).default;
      const moment = (await import('moment')).default;
      const mongoose = (await import('mongoose')).default;
      
      logger.info({ userId, conversationId }, 'Checking for auto-attendance');
      
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        logger.warn({ conversationId }, 'Conversation not found for auto-attendance');
      } else if (conversation?.group?.is_group && conversation?.group?.type === 'classroom') {
        // Only auto-mark for classroom type conversations
        // Check if user is a student (not admin/teacher)
        const adminIds = conversation.group.admins.map(id => id.toString());
        const isAdmin = adminIds.includes(userId.toString());
        
        logger.info({ 
          userId, 
          isAdmin,
          isGroup: conversation.group.is_group,
          classType: conversation.group.type
        }, 'Classroom detected, checking admin status');
        
        if (!isAdmin) {
          // Find active session for today
          const today = moment().format('YYYY-MM-DD');
          const activeSession = await Session.findOne({
            classId: conversationId,
            date: today,
            status: { $in: ['scheduled', 'ongoing'] }
          });
          
          logger.info({ 
            today,
            activeSession: activeSession ? activeSession._id.toString() : null,
            sessionDate: activeSession?.date,
            sessionStatus: activeSession?.status
          }, 'Session search result');
          
          if (activeSession) {
            // Check if attendance already marked
            let attendanceLog = await AttendanceLog.findOne({
              sessionId: activeSession._id,
              userId: userId,
              sessionDate: today
            });
            
            logger.info({ 
              attendanceExists: !!attendanceLog,
              attendanceId: attendanceLog?._id?.toString(),
              currentStatus: attendanceLog?.status
            }, 'Existing attendance check');
            
            // Determine status based on current time vs session start time
            const now = moment();
            const sessionTime = moment(`${activeSession.date} ${activeSession.startTime}`, 'YYYY-MM-DD HH:mm');
            const cutoffTime = activeSession.cutoffTime 
              ? moment(`${activeSession.date} ${activeSession.cutoffTime}`, 'YYYY-MM-DD HH:mm')
              : sessionTime.clone().add(15, 'minutes');
            
            let status = 'present';
            if (now.isAfter(cutoffTime)) {
              status = 'late';
            } else if (now.isBefore(sessionTime)) {
              status = 'present'; // Early arrival
            } else {
              status = 'present';
            }
            
            logger.info({ 
              now: now.format('YYYY-MM-DD HH:mm'),
              sessionTime: sessionTime.format('YYYY-MM-DD HH:mm'),
              cutoffTime: cutoffTime.format('YYYY-MM-DD HH:mm'),
              calculatedStatus: status
            }, 'Calculated attendance status');
            
            try {
              if (!attendanceLog) {
                // Create new attendance record
                attendanceLog = new AttendanceLog({
                  sessionId: activeSession._id,
                  classId: conversationId,
                  userId: userId,
                  sessionDate: today,
                  enteredAt: new Date(),
                  status
                });
                
                const savedLog = await attendanceLog.save();
                
                logger.info({ 
                  userId,
                  conversationId,
                  sessionId: activeSession._id.toString(),
                  status,
                  attendanceId: savedLog._id.toString(),
                  saved: true
                }, '✅ AUTO-ATTENDANCE: Created new attendance record');
              } else if (attendanceLog.status === 'absent') {
                // Update absent status to present/late when user actually joins
                const oldStatus = attendanceLog.status;
                attendanceLog.status = status;
                attendanceLog.enteredAt = new Date();
                
                const updatedLog = await attendanceLog.save();
                
                logger.info({ 
                  userId,
                  conversationId,
                  sessionId: activeSession._id.toString(),
                  oldStatus,
                  newStatus: updatedLog.status,
                  attendanceId: updatedLog._id.toString(),
                  saved: true
                }, '✅ AUTO-ATTENDANCE: Updated from absent to present/late');
              } else {
                logger.info({ 
                  userId, 
                  sessionId: activeSession._id.toString(),
                  existingStatus: attendanceLog.status
                }, 'Attendance already marked as present/late, skipping');
              }
            } catch (error) {
              logger.error({ 
                error: error.message,
                stack: error.stack,
                userId,
                sessionId: activeSession._id.toString()
              }, '❌ Failed to save attendance');
            }
          } else {
            logger.info({ conversationId, today }, 'No active session found for today');
          }
        } else {
          logger.info({ userId }, 'User is admin, skipping auto-attendance');
        }
      } else {
        logger.info({ 
          conversationId,
          isGroup: conversation?.group?.is_group,
          type: conversation?.group?.type
        }, 'Not a classroom, skipping auto-attendance');
      }
    } catch (error) {
      logger.error({ error, userId, conversationId }, 'Error auto-marking attendance');
    }

    // Safe read — the Map entry is guaranteed to exist (set above),
    // but guard defensively in case a future refactor changes that.
    const activeUsersList = this.activeUsers.has(conversationId)
      ? Array.from(this.activeUsers.get(conversationId).values())
      : [];

    this.io.to(`conv:${conversationId}`).emit('conversation:userJoined', {
      conversationId,
      userId,
      activeUsers: activeUsersList
    });

    this.io.to(`conv:${conversationId}`).emit('activeUsersUpdate', activeUsersList);

    logger.info({
      socketId: socket.id,
      userId,
      conversationId
    }, 'User joined conversation');

    } catch (err) {
      // Top-level catch: prevents a single bad join from crashing the whole process.
      logger.error({ err, userId, conversationId }, '❌ handleJoinConversation: unhandled error');
    }
  }

  /**
   * Handle leave conversation
   */
  handleLeaveConversation(socket, conversationId) {
    const userId = socket.user?.id;

    if (!conversationId || typeof conversationId !== 'string') {
      logger.warn({ userId, conversationId }, 'handleLeaveConversation: invalid conversationId, ignoring');
      return;
    }

    try {
      socket.leave(`conv:${conversationId}`);

      if (this.activeUsers.has(conversationId)) {
        this.activeUsers.get(conversationId).delete(userId);
        if (this.activeUsers.get(conversationId).size === 0) {
          this.activeUsers.delete(conversationId);
        }
      }

      const activeUsersList = this.activeUsers.has(conversationId)
        ? Array.from(this.activeUsers.get(conversationId).values())
        : [];

      this.io.to(`conv:${conversationId}`).emit('conversation:userLeft', {
        conversationId,
        userId,
        activeUsers: activeUsersList
      });

      this.io.to(`conv:${conversationId}`).emit('activeUsersUpdate', activeUsersList);

      logger.info({ socketId: socket.id, userId, conversationId }, 'User left conversation');
    } catch (err) {
      logger.error({ err, userId, conversationId }, '❌ handleLeaveConversation: unhandled error');
    }
  }

  /**
   * Get active users in conversation
   */
  handleGetActiveUsers(socket, conversationId) {
    try {
      const activeUsers = this.activeUsers.has(conversationId)
        ? Array.from(this.activeUsers.get(conversationId).values())
        : [];

      socket.emit('conversation:activeUsers', { conversationId, activeUsers });
      socket.emit('activeUsersUpdate', activeUsers);
    } catch (err) {
      logger.error({ err, conversationId }, '❌ handleGetActiveUsers: unhandled error');
    }
  }

  /**
   * Handle reset unread request count
   */
  async handleResetUnreadRequest(socket, requestType) {
    const userId = socket.user?.id;
    
    if (!userId) {
      logger.error("No user ID found in socket for reset_unread_request");
      return;
    }

    try {
      logger.info({ userId, requestType }, "Resetting unread request count");
      
      // Import the reset function dynamically
      const { resetUnreadRequestCount } = await import('./conversation.controller.js');
      
      // Reset the unread count
      const updatedCounts = await resetUnreadRequestCount(userId, requestType);
      
      // Emit updated counts back to the user
      socket.emit("unread_counts_updated", updatedCounts);
      
      logger.info({ userId, requestType, updatedCounts }, "Unread request count reset successfully");
    } catch (error) {
      logger.error({ error, userId, requestType }, "Error resetting unread request count");
      socket.emit("error", { message: "Failed to reset unread request count" });
    }
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    const userId = socket.user?.id;
    
    // Remove user from all active conversations
    this.activeUsers.forEach((users, conversationId) => {
      if (users.has(userId)) {
        users.delete(userId);
        
        const activeUsersList = Array.from(users.values());
        
        // Notify conversation
        this.io.to(`conv:${conversationId}`).emit("conversation:userLeft", {
          conversationId,
          userId,
          activeUsers: activeUsersList
        });
        
        // Also emit the event frontend is listening for
        this.io.to(`conv:${conversationId}`).emit("activeUsersUpdate", activeUsersList);
        
        if (users.size === 0) {
          this.activeUsers.delete(conversationId);
        }
      }
    });
    
    logger.debug({ 
      socketId: socket.id, 
      userId,
      reason 
    }, "Conversation gateway disconnect");
  }
}