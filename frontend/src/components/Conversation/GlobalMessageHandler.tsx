// @ts-nocheck
/**
 * GlobalMessageHandler Component
 * 
 * This component implements a centralized message handling system similar to Messenger/WhatsApp.
 * It listens for messages across ALL conversations when the user is logged in,
 * not just the conversation they are currently viewing.
 * 
 * Key Features:
 * - Subscribes to global message events on socket connection
 * - Updates Redux state for any conversation that receives a message
 * - Handles new message notifications
 * - Syncs conversation list in real-time
 * - Works regardless of which conversation is currently active
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { 
  addMessage, 
  updateMessage, 
  setAllConversations,
  updateConversationLastMessage 
} from '@/redux/slices/conversationSlice';
import { selectMessagesByConversationId } from '@/lib/conversationSelectors';
import toast from 'react-hot-toast';

const GlobalMessageHandler = (): JSX.Element | null => {
  const dispatch = useDispatch();
  const { user, socket }: any = useUserAuth();
  const { allConversations, conversationId: activeConversationId }: any = useSelector((state: any) => state.conversation);
  const processedMessages = useRef<Set<string>>(new Set());

  /**
   * Get unique readBy entries
   */
  const getUniqueReadBy = useCallback((existingReadBy, newReadBy) => {
    const combined = [...(existingReadBy || []), ...(newReadBy || [])];
    return Array.from(new Map(combined.map(item => [item.user + item.readAt, item])).values());
  }, []);

  /**
   * Handle incoming message from any conversation
   */
  const handleGlobalMessage = useCallback((message) => {
    if (!message || !user?._id) return;
    
    const conversationId = message.conversationId || message.conversation;
    if (!conversationId) {
      console.warn('Received message without conversationId:', message);
      return;
    }

    // Prevent processing duplicate messages
    const messageKey = message._id || message.clientTempId;
    if (!messageKey) return;
    
    if (processedMessages.current.has(messageKey)) {
      return;
    }
    processedMessages.current.add(messageKey);
    
    // Clean up old entries to prevent memory leak (keep last 1000)
    if (processedMessages.current.size > 1000) {
      const entries = Array.from(processedMessages.current);
      entries.slice(0, 500).forEach(key => processedMessages.current.delete(key));
    }

    // Skip own messages (they are handled optimistically by the sender)
    const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
    if (senderId === user._id) {
      return;
    }

    // Validate message has content
    if (!message.text?.trim() && !message.media?.length && !message.voice && !message.call && !message.img) {
      return;
    }

    console.log('📩 Global message received:', { 
      conversationId, 
      messageId: messageKey,
      isActiveConversation: conversationId === activeConversationId 
    });

    // Add message to the appropriate conversation in Redux
    const messageToAdd = {
      ...message,
      conversation: conversationId,
      readBy: message.readBy || [],
      status: message.status || 'sent',
      updatedAt: new Date().toISOString()
    };

    dispatch(addMessage(messageToAdd));

    // Move conversation to top + update preview + increment unread if not currently viewing
    const previewText = message.text || (message.media?.length ? '[Media]' : message.voice ? '[Voice]' : '[Message]');
    dispatch(updateConversationLastMessage({
      conversationId,
      lastMessage: previewText,
      lastMessageTime: message.createdAt || new Date().toISOString(),
      sender: senderId,
      currentUserId: user._id,
      isActiveConversation: conversationId === activeConversationId,
    }));

    // Acknowledge delivery to the server - the message reached this device
    if (socket) {
      socket.emit('messageDelivered', { conversationId, userId: user._id });
    }

  }, [user?._id, activeConversationId, dispatch]);

  /**
   * Handle new message notification (for conversations not currently active)
   */
  const handleNewMessageNotification = useCallback((data) => {
    if (!data || !user?._id) return;
    
    const { conversationId, message, senderInfo } = data;
    
    // Don't show notification if viewing this conversation
    if (conversationId === activeConversationId) {
      return;
    }

    // Show toast notification for new message
    const senderName = senderInfo?.name || 'Someone';
    const messagePreview = message?.text?.substring(0, 50) || 
                          (message?.hasMedia ? '📷 Media' : 
                          (message?.hasVoice ? '🎤 Voice message' : 'New message'));
    
    toast((t) => (
      <div 
        onClick={() => {
          toast.dismiss(t._id);
          // Navigate to conversation (you can add navigation logic here)
        }}
        className="flex items-center gap-3 cursor-pointer"
      >
        <img 
          src={senderInfo?.image || '/images/avatar/default-avatar.png'} 
          alt={senderName}
          className="w-10 h-10 rounded-full object-cover"
          onError={(e) => { e.target.src = '/images/avatar/default-avatar.png'; }}
        />
        <div>
          <p className="font-semibold text-sm">{senderName}</p>
          <p className="text-xs text-gray-500 truncate max-w-[200px]">{messagePreview}</p>
        </div>
      </div>
    ), {
      duration: 4000,
      position: 'top-right',
    });

  }, [user?._id, activeConversationId]);

  /**
   * Handle conversation updates (new message, status changes, etc.)
   */
  const handleConversationUpdate = useCallback((updatedConversation) => {
    if (!updatedConversation?._id) return;
    
    // Update the conversation in the list
    const newConversations = allConversations.filter(
      (c) => c._id !== updatedConversation._id
    );
    newConversations.unshift(updatedConversation);
    const limitedConversations = newConversations.slice(0, 30);
    dispatch(setAllConversations(limitedConversations));
    
  }, [allConversations, dispatch]);

  /**
   * Handle message status updates (delivered, read)
   */
  const handleMessageStatus = useCallback(({ messageId, status, readBy, conversationId }) => {
    if (!messageId || !user?._id) return;
    
    dispatch(updateMessage({
      messageId,
      message: {
        id: messageId,
        status,
        readBy: readBy || [],
        conversationId: conversationId,
        conversation: conversationId
      }
    }));
  }, [user?._id, dispatch]);

  /**
   * Handle message deletion
   */
  const handleMessageDeleted = useCallback(({ messageId, userId, hardDelete, conversationId }) => {
    if (!messageId) return;
    
    if (hardDelete) {
      dispatch(updateMessage({
        messageId,
        message: null
      }));
    } else {
      dispatch(updateMessage({
        messageId,
        message: { 
          id: messageId, 
          deletedBy: [userId],
          conversationId: conversationId,
          conversation: conversationId
        }
      }));
    }
  }, [dispatch]);

  /**
   * Subscribe to global socket events
   */
  useEffect(() => {
    if (!socket || !user?._id) {
      return;
    }

    console.log('🌐 Subscribing to global message events');

    // Subscribe to global messages
    socket.emit('subscribeToGlobalMessages');
    socket.emit('join_conversations_room');

    // Listen for messages from any conversation
    socket.on('receiveMessage', handleGlobalMessage);
    
    // Listen for new message notifications
    socket.on('newMessageNotification', handleNewMessageNotification);
    
    // Listen for conversation updates
    socket.on('conversation_updated', handleConversationUpdate);
    
    // Listen for message status updates
    socket.on('messageStatus', handleMessageStatus);

    // Listen for messages marked as read by other participants
    const handleMessagesRead = ({ conversationId, userId, messageIds }) => {
      if (userId === user._id || !messageIds?.length) return;
      messageIds.forEach(messageId => {
        dispatch(updateMessage({
          messageId,
          message: {
            id: messageId,
            status: 'read',
            readBy: [{ user: userId, readAt: new Date().toISOString() }],
            conversationId: conversationId,
            conversation: conversationId
          }
        }));
      });
    };
    socket.on('messagesRead', handleMessagesRead);

    // Listen for messages marked as delivered to other participants
    const handleMessagesDelivered = ({ conversationId, userId, messageIds }) => {
      if (userId === user._id || !messageIds?.length) return;
      messageIds.forEach(messageId => {
        dispatch(updateMessage({
          messageId,
          message: {
            id: messageId,
            status: 'delivered',
            conversationId: conversationId,
            conversation: conversationId
          }
        }));
      });
    };
    socket.on('messagesDelivered', handleMessagesDelivered);
    
    // Listen for message deletion
    socket.on('messageDeleted', handleMessageDeleted);

    // Listen for message edits from other participants
    const handleMessageEdited = (editedMessage) => {
      if (!editedMessage) return;
      const msgId = editedMessage._id || editedMessage._id;
      const convId = editedMessage.conversationId || editedMessage.conversation;
      if (msgId) {
        dispatch(updateMessage({
          messageId: msgId,
          message: { ...editedMessage, id: msgId, conversationId: convId, conversation: convId }
        }));
      }
    };
    socket.on('messageEdited', handleMessageEdited);

    // Handle reconnection
    socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected, resubscribing to global messages');
      socket.emit('subscribeToGlobalMessages');
      socket.emit('refreshConversationRooms');
      socket.emit('join_conversations_room');
    });

    return () => {
      console.log('🔌 Unsubscribing from global message events');
      socket.off('receiveMessage', handleGlobalMessage);
      socket.off('newMessageNotification', handleNewMessageNotification);
      socket.off('conversation_updated', handleConversationUpdate);
      socket.off('messageStatus', handleMessageStatus);
      socket.off('messagesRead', handleMessagesRead);
      socket.off('messagesDelivered', handleMessagesDelivered);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('reconnect');
    };
  }, [
    socket, 
    user?._id, 
    handleGlobalMessage, 
    handleNewMessageNotification, 
    handleConversationUpdate,
    handleMessageStatus,
    handleMessageDeleted,
    dispatch
  ]);

  // This component doesn't render anything - it just handles socket events
  return null;
};

export default GlobalMessageHandler;
