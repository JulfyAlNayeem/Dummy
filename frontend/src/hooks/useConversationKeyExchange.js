/**
 * Custom hook for managing conversation key exchange
 * Handles the complete workflow: conversation creation → key generation → key exchange
 */

import { useEffect, useCallback, useRef } from 'react';
import { useExchangeConversationKeyMutation } from '@/redux/api/conversationKeyApi';
import { 
  handleConversationKeyExchange, 
  hasExchangedKeys,
  getOtherParticipantId 
} from '@/utils/conversationKeyExchange';
import { useUserAuth } from '@/context-reducer/UserAuthContext';

export function useConversationKeyExchange(conversationId, receiver, conversation) {
  const { user } = useUserAuth();
  const [exchangeKeyMutation, { isLoading: isExchanging }] = useExchangeConversationKeyMutation();
  const hasInitialized = useRef(false);
  const currentConversationId = useRef(null);

  /**
   * Initialize key exchange for a conversation
   */
  const initializeKeyExchange = useCallback(async () => {
    if (!conversationId || !user?._id) {
      return { success: false, reason: 'missing_params' };
    }

    // Check if we already have keys
    if (hasExchangedKeys(conversationId)) {
      console.log(`✅ Keys already exist for conversation: ${conversationId}`);
      return { success: true, reason: 'already_exists' };
    }

    // Prevent duplicate initialization for the same conversation
    if (currentConversationId.current === conversationId && hasInitialized.current) {
      return { success: true, reason: 'already_initialized' };
    }

    try {
      // Determine other participant
      let otherUserId = receiver;
      
      if (conversation) {
        otherUserId = getOtherParticipantId(conversation, user._id);
      }

      if (!otherUserId) {
        console.warn('Cannot determine other participant for key exchange');
        return { success: false, reason: 'no_other_participant' };
      }

      console.log(`🔄 Initializing key exchange for conversation: ${conversationId}`);
      
      const result = await handleConversationKeyExchange(
        conversationId,
        user._id,
        otherUserId,
        exchangeKeyMutation
      );

      if (result.success) {
        hasInitialized.current = true;
        currentConversationId.current = conversationId;
      }

      return result;

    } catch (error) {
      console.error('Failed to initialize key exchange:', error);
      return { 
        success: false, 
        reason: 'error',
        error: error.message 
      };
    }
  }, [conversationId, user?._id, receiver, conversation, exchangeKeyMutation]);

  /**
   * Auto-initialize key exchange when conversation is ready
   */
  useEffect(() => {
    // Reset initialization flag when conversation changes
    if (currentConversationId.current !== conversationId) {
      hasInitialized.current = false;
      currentConversationId.current = conversationId;
    }

    // Only proceed if we have a conversation ID and haven't initialized yet
    if (conversationId && !hasInitialized.current && !hasExchangedKeys(conversationId)) {
      // Small delay to ensure conversation is fully created in backend
      const timer = setTimeout(() => {
        initializeKeyExchange();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [conversationId, initializeKeyExchange]);

  return {
    initializeKeyExchange,
    isExchanging,
    hasKeys: conversationId ? hasExchangedKeys(conversationId) : false
  };
}

export default useConversationKeyExchange;