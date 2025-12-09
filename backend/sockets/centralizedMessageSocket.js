/**
 * Centralized Message Socket Handler
 * 
 * This module implements a messenger-like socket architecture where users receive
 * real-time messages for ALL their conversations after login, not just the one
 * they are currently viewing.
 * 
 * Key Features:
 * - Auto-joins users to all their conversation rooms upon connection
 * - Emits messages to user rooms (user_{userId}) for global delivery
 * - Maintains conversation room membership for typing indicators and read receipts
 * - Handles reconnection gracefully by rejoining all rooms
 */

import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import logger from "../utils/logger.js";

// Store user socket mappings for quick lookup
const userSockets = new Map(); // userId -> Set of socketIds

/**
 * Get all conversation IDs for a user
 */
const getUserConversations = async (userId) => {
  try {
    const conversations = await Conversation.find({
      participants: userId,
      status: { $in: ['active', 'pending'] }
    }).select('_id').lean();
    
    return conversations.map(c => c._id.toString());
  } catch (error) {
    logger.error({ error, userId }, 'Error fetching user conversations');
    return [];
  }
};

/**
 * Join user to all their conversation rooms
 */
const joinUserToAllConversations = async (socket, userId) => {
  const conversationIds = await getUserConversations(userId);
  
  // Join each conversation room
  for (const convId of conversationIds) {
    socket.join(`conv:${convId}`);
  }
  
  // Also join the legacy room format for backward compatibility
  for (const convId of conversationIds) {
    socket.join(convId);
  }
  
  logger.info({ 
    socketId: socket.id, 
    userId, 
    conversationCount: conversationIds.length 
  }, '🔌 User joined all conversation rooms');
  
  return conversationIds;
};

/**
 * Add user socket to tracking map
 */
const addUserSocket = (userId, socketId) => {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socketId);
};

/**
 * Remove user socket from tracking map
 */
const removeUserSocket = (userId, socketId) => {
  if (userSockets.has(userId)) {
    userSockets.get(userId).delete(socketId);
    if (userSockets.get(userId).size === 0) {
      userSockets.delete(userId);
    }
  }
};

/**
 * Get all socket IDs for a user (they might have multiple tabs/devices)
 */
export const getUserSocketIds = (userId) => {
  return userSockets.has(userId) ? Array.from(userSockets.get(userId)) : [];
};

/**
 * Emit message to all participants of a conversation
 * This ensures users receive messages even when not viewing that conversation
 */
export const emitMessageToConversationParticipants = async (io, conversationId, eventName, data) => {
  try {
    const conversation = await Conversation.findById(conversationId)
      .select('participants')
      .lean();
    
    if (!conversation) {
      logger.warn({ conversationId }, 'Conversation not found for message emission');
      return;
    }
    
    // Emit to each participant's user room AND the conversation room
    for (const participantId of conversation.participants) {
      const participantIdStr = participantId.toString();
      
      // Emit to user's personal room (they'll receive this even if not in the conversation view)
      io.to(`user_${participantIdStr}`).emit(eventName, {
        ...data,
        conversationId: conversationId.toString()
      });
    }
    
    // Also emit to the conversation room for active viewers
    io.to(`conv:${conversationId}`).emit(eventName, data);
    io.to(conversationId.toString()).emit(eventName, data);
    
  } catch (error) {
    logger.error({ error, conversationId, eventName }, 'Error emitting message to participants');
  }
};

/**
 * Register centralized message handlers
 */
export const registerCentralizedMessageHandlers = (io, socket) => {
  const userId = socket.user?.id;
  
  if (!userId) {
    logger.warn({ socketId: socket.id }, 'Socket connected without user authentication');
    return;
  }
  
  // Track this socket
  addUserSocket(userId, socket.id);
  
  // Auto-join user to all their conversation rooms
  joinUserToAllConversations(socket, userId);
  
  // Handle request to refresh conversation rooms (after new conversation created)
  socket.on('refreshConversationRooms', async () => {
    await joinUserToAllConversations(socket, userId);
    socket.emit('conversationRoomsRefreshed');
  });
  
  // Handle joining a new conversation room (when a new conversation is created)
  socket.on('joinNewConversation', (conversationId) => {
    if (conversationId) {
      socket.join(`conv:${conversationId}`);
      socket.join(conversationId.toString());
      logger.info({ socketId: socket.id, userId, conversationId }, 'User joined new conversation room');
    }
  });
  
  // Handle global message reception (for messages from any conversation)
  socket.on('subscribeToGlobalMessages', () => {
    // User is already subscribed through their user room (user_{userId})
    socket.emit('globalMessagesSubscribed', { userId });
    logger.info({ socketId: socket.id, userId }, 'User subscribed to global messages');
  });
  
  // Handle active conversation focus (for typing indicators, read receipts)
  socket.on('focusConversation', (conversationId) => {
    if (conversationId) {
      // Store the focused conversation on the socket for read receipt logic
      socket.focusedConversation = conversationId;
      logger.debug({ socketId: socket.id, userId, conversationId }, 'User focused on conversation');
    }
  });
  
  socket.on('unfocusConversation', () => {
    socket.focusedConversation = null;
  });
  
  // Cleanup on disconnect
  socket.on('disconnect', () => {
    removeUserSocket(userId, socket.id);
    logger.info({ socketId: socket.id, userId }, '🔌 User socket disconnected from centralized handler');
  });
};

/**
 * Helper to emit new message notification to participants who are NOT in the conversation view
 */
export const emitNewMessageNotification = async (io, conversationId, message, senderId) => {
  try {
    const conversation = await Conversation.findById(conversationId)
      .select('participants')
      .populate('participants', 'name image')
      .lean();
    
    if (!conversation) return;
    
    for (const participant of conversation.participants) {
      const participantIdStr = participant._id.toString();
      
      // Don't notify the sender
      if (participantIdStr === senderId) continue;
      
      // Emit to user's personal room
      io.to(`user_${participantIdStr}`).emit('newMessageNotification', {
        conversationId: conversationId.toString(),
        message: {
          _id: message._id,
          text: message.text,
          sender: message.sender,
          createdAt: message.createdAt,
          hasMedia: message.media?.length > 0,
          hasVoice: !!message.voice,
        },
        senderInfo: conversation.participants.find(p => p._id.toString() === senderId)
      });
    }
  } catch (error) {
    logger.error({ error, conversationId }, 'Error emitting new message notification');
  }
};

export default {
  registerCentralizedMessageHandlers,
  emitMessageToConversationParticipants,
  emitNewMessageNotification,
  getUserSocketIds,
};
