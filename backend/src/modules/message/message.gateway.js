/**
 * Message Gateway
 * Handles all message-related WebSocket events
 * 
 * Events:
 * - message:send - Send a text message
 * - message:sendEmoji - Send an emoji message
 * - message:typing - Typing indicator
 * - message:read - Mark messages as read
 * - message:delete - Delete a message
 * - message:reply - Reply to a message
 * - message:edit - Edit a message
 * - message:react - Add reaction to message
 * - message:unreact - Remove reaction from message
 * - message:joinRoom - Join a conversation room
 */

import {
  deleteMessage,
  markMessagesAsRead,
  markMessagesAsDelivered,
  sendTextMessage,
  handleSendEmojiSocket,
  sendReplyCore,
  editMessageCore,
  addReaction,
  removeReaction,
} from "./message.controller.js";
import logger from "../../common/utils/logger.js";
import Conversation from "../../common/models/conversationModel.js";

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
    socket.join(convId); // Legacy format for backward compatibility
  }
  
  // Join user's personal room
  socket.join(`user_${userId}`);
  
  logger.info({ 
    socketId: socket.id, 
    userId, 
    conversationCount: conversationIds.length 
  }, '🔌 User auto-joined to all conversation rooms');
  
  return conversationIds;
};

/**
 * Emit message to all participants of a conversation
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
    
    // Emit to each participant's user room (they'll receive even if not viewing that conversation)
    for (const participantId of conversation.participants) {
      const participantIdStr = participantId.toString();
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

export class MessageGateway {
  constructor(io) {
    this.io = io;
  }

  /**
   * Handle new socket connection
   */
  async handleConnection(socket) {
    const userId = socket.user?.id;
    
    if (userId) {
      // Auto-join user to all their conversation rooms
      await joinUserToAllConversations(socket, userId);
      
      // Track user socket
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
    }
    
    // Register all message event handlers
    socket.on("joinRoom", this.handleJoinRoom.bind(this, socket));
    socket.on("message:joinRoom", this.handleJoinRoom.bind(this, socket));
    
    // Handle refresh conversation rooms
    socket.on('refreshConversationRooms', async () => {
      if (userId) {
        await joinUserToAllConversations(socket, userId);
        socket.emit('conversationRoomsRefreshed');
      }
    });
    
    socket.on("typing", this.handleTyping.bind(this, socket));
    socket.on("message:typing", this.handleTyping.bind(this, socket));
    
    socket.on("sendMessage", this.handleSendMessage.bind(this, socket));
    socket.on("message:send", this.handleSendMessage.bind(this, socket));
    
    socket.on("sendEmoji", this.handleSendEmoji.bind(this, socket));
    socket.on("message:sendEmoji", this.handleSendEmoji.bind(this, socket));
    
    socket.on("messageRead", this.handleMessageRead.bind(this, socket));
    socket.on("message:read", this.handleMessageRead.bind(this, socket));
    
    socket.on("messageDelivered", this.handleMessageDelivered.bind(this, socket));
    socket.on("message:delivered", this.handleMessageDelivered.bind(this, socket));
    
    socket.on("deleteMessage", this.handleDeleteMessage.bind(this, socket));
    socket.on("message:delete", this.handleDeleteMessage.bind(this, socket));
    
    socket.on("replyMessage", this.handleReplyMessage.bind(this, socket));
    socket.on("message:reply", this.handleReplyMessage.bind(this, socket));
    
    socket.on("editMessage", this.handleEditMessage.bind(this, socket));
    socket.on("message:edit", this.handleEditMessage.bind(this, socket));
    
    socket.on("addReaction", this.handleAddReaction.bind(this, socket));
    socket.on("message:react", this.handleAddReaction.bind(this, socket));
    
    socket.on("removeReaction", this.handleRemoveReaction.bind(this, socket));
    socket.on("message:unreact", this.handleRemoveReaction.bind(this, socket));
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(socket) {
    const userId = socket.user?.id;
    if (userId && userSockets.has(userId)) {
      userSockets.get(userId).delete(socket.id);
      if (userSockets.get(userId).size === 0) {
        userSockets.delete(userId);
      }
    }
  }

  /**
   * Join a conversation room
   */
  handleJoinRoom(socket, conversationId) {
    socket.join(conversationId);
    logger.debug({ 
      socketId: socket.id, 
      userId: socket.user?.id,
      conversationId 
    }, "Joined conversation room");
  }

  /**
   * Handle typing indicator
   */
  handleTyping(socket, { conversationId, userId, isTyping }) {
    this.io.to(conversationId).emit("typing", { userId, isTyping });
    this.io.to(conversationId).emit("message:typing", { userId, isTyping });
  }

  /**
   * Handle sending text message
   */
  async handleSendMessage(socket, { conversationId, sender, receiver, text, clientTempId }) {
    logger.debug({ conversationId, sender, clientTempId }, "Sending message");
    
    if (!sender) {
      logger.error("Invalid sender for sendMessage");
      socket.emit("sendMessageError", { 
        message: "Invalid sender", 
        clientTempId 
      });
      return;
    }

    await sendTextMessage({
      io: this.io,
      socket,
      conversationId,
      sender,
      receiver,
      text,
      clientTempId,
    });
  }

  /**
   * Handle sending emoji message
   */
  async handleSendEmoji(socket, { conversationId, sender, receiver, data, clientTempId }) {
    if (!sender || !data) {
      logger.error({ sender, data }, "Invalid sendEmoji data");
      socket.emit("sendMessageError", {
        message: "Invalid sender or data",
        clientTempId,
      });
      return;
    }

    try {
      await handleSendEmojiSocket({
        userId: sender,
        conversationId,
        receiver,
        data,
        isSocket: true,
        socket,
        io: this.io,
        clientTempId,
      });
    } catch (error) {
      logger.error({ error: error.message }, "sendEmoji handler error");
      socket.emit("sendMessageError", {
        message: "Server error",
        clientTempId,
      });
    }
  }

  /**
   * Handle mark messages as read
   */
  async handleMessageRead(socket, { conversationId, userId }) {
    await markMessagesAsRead(conversationId, userId, this.io);
  }

  /**
   * Handle mark messages as delivered (recipient's device received the message)
   */
  async handleMessageDelivered(socket, { conversationId, userId }) {
    await markMessagesAsDelivered(conversationId, userId, this.io);
  }

  /**
   * Handle delete message
   */
  async handleDeleteMessage(socket, { messageId, userId }) {
    await deleteMessage({ 
      io: this.io, 
      socket, 
      messageId, 
      userId 
    });
  }

  /**
   * Handle reply to message
   */
  async handleReplyMessage(socket, {
    conversationId,
    messageId,
    text,
    messageType = "reply",
    htmlEmoji,
    emojiType,
    media,
    clientTempId,
  }) {
    try {
      if (!conversationId || !messageId || !clientTempId) {
        socket.emit("replyMessageError", {
          message: "Missing required fields: conversationId, messageId, or clientTempId",
          clientTempId,
        });
        return;
      }

      const sender = socket.user.id;
      const result = await sendReplyCore({
        sender,
        conversationId,
        messageId,
        text,
        messageType,
        htmlEmoji,
        emojiType,
        clientTempId,
      });

      if (!result.success) {
        socket.emit("replyMessageError", {
          message: result.message,
          clientTempId
        });
        logger.error({ message: result.message }, "Failed to send reply");
        return;
      }

      this.io.to(conversationId).emit("replyReceiveMessage", result.message);
      this.io.to(conversationId).emit("message:reply", result.message);
      
      socket.emit("replyMessageSuccess", {
        message: result.message,
        conversationId,
        clientTempId,
      });
    } catch (error) {
      logger.error({ error: error.message }, "replyMessage error");
      socket.emit("replyMessageError", {
        message: error.message || "Server error",
        clientTempId,
      });
    }
  }

  /**
   * Handle edit message
   */
  async handleEditMessage(socket, { messageId, text, htmlEmoji, emojiType, clientTempId }) {
    try {
      if (!messageId || !clientTempId) {
        socket.emit("editMessageError", {
          message: "Missing required fields: messageId or clientTempId",
          clientTempId,
        });
        return;
      }

      const userId = socket.user.id;
      const result = await editMessageCore({
        userId,
        messageId,
        text,
        htmlEmoji,
        emojiType,
        clientTempId,
      });

      if (!result.success) {
        socket.emit("editMessageError", {
          message: result.message,
          clientTempId
        });
        return;
      }

      // Broadcast to conversation
      this.io.to(result.message.conversationId).emit("messageEdited", result.message);
      this.io.to(result.message.conversationId).emit("message:edited", result.message);
      
      socket.emit("editMessageSuccess", {
        message: result.message,
        clientTempId,
      });
    } catch (error) {
      logger.error({ error: error.message }, "editMessage error");
      socket.emit("editMessageError", {
        message: error.message || "Server error",
        clientTempId,
      });
    }
  }

  /**
   * Handle add reaction
   */
  async handleAddReaction(socket, { messageId, reaction, clientTempId }) {
    try {
      if (!messageId || !reaction) {
        socket.emit("reactionError", {
          message: "Missing messageId or reaction",
          clientTempId
        });
        return;
      }

      const userId = socket.user.id;
      const result = await addReaction({
        userId,
        messageId,
        reaction,
        io: this.io,
      });

      if (result.success) {
        socket.emit("reactionSuccess", {
          messageId,
          reaction,
          clientTempId
        });
      }
    } catch (error) {
      logger.error({ error: error.message }, "addReaction error");
      socket.emit("reactionError", {
        message: error.message,
        clientTempId
      });
    }
  }

  /**
   * Handle remove reaction
   */
  async handleRemoveReaction(socket, { messageId, reaction, clientTempId }) {
    try {
      if (!messageId || !reaction) {
        socket.emit("unreactionError", {
          message: "Missing messageId or reaction",
          clientTempId
        });
        return;
      }

      const userId = socket.user.id;
      const result = await removeReaction({
        userId,
        messageId,
        reaction,
        io: this.io,
      });

      if (result.success) {
        socket.emit("unreactionSuccess", {
          messageId,
          reaction,
          clientTempId
        });
      }
    } catch (error) {
      logger.error({ error: error.message }, "removeReaction error");
      socket.emit("unreactionError", {
        message: error.message,
        clientTempId
      });
    }
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    logger.debug({ 
      socketId: socket.id, 
      userId: socket.user?.id,
      reason 
    }, "Message gateway disconnect");
  }
}
