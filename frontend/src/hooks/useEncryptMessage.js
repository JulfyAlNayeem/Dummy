// hooks/useEncryptMessage.js
import { prepareAndEncryptMessage } from '@/utils/messageEncryptionWorkflow';
import { useExchangeConversationKeyMutation, useLazyGetParticipantKeyQuery } from '@/redux/api/conversationKeyApi';
import { useState, useCallback } from 'react';
import { useUserAuth } from '@/context-reducer/UserAuthContext';

export function useEncryptMessage(conversationId, receiver) {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useUserAuth();
  
  const [exchangeKeyMutation] = useExchangeConversationKeyMutation();
  const [getParticipantKey] = useLazyGetParticipantKeyQuery();

  const encrypt = useCallback(async (plainMessage) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 useEncryptMessage.encrypt() CALLED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Parameters:', {
      plainMessage: plainMessage?.substring(0, 50) + '...',
      conversationId,
      receiver,
      userId: user?._id
    });
    
    if (!plainMessage || !conversationId) {
      console.log('⚠️ Missing required parameters (message or conversationId), returning original message');
      console.log('  plainMessage:', !!plainMessage);
      console.log('  conversationId:', !!conversationId);
      return plainMessage || '';
    }

    setIsEncrypting(true);
    setError(null);

    try {
      console.log('🔐 useEncryptMessage: Starting simplified encryption workflow...');
      
      // Use the simplified workflow
      const result = await prepareAndEncryptMessage({
        message: plainMessage,
        conversationId: conversationId,
        currentUserId: user._id,
        otherUserId: receiver, // Can be null - workflow handles it
        exchangeKeyMutation: exchangeKeyMutation,
        getParticipantKeyQuery: getParticipantKey,
      });
      
      console.log('✅ useEncryptMessage: Workflow complete', {
        encrypted: result.encrypted,
        messagePreview: result.message.substring(0, 50) + '...',
        reason: result.reason || 'success'
      });
      
      return result.message;
    } catch (err) {
      console.error('❌ useEncryptMessage: Encryption failed:', err);
      setError(err);
      return plainMessage; // Return original on error
    } finally {
      setIsEncrypting(false);
    }
  }, [conversationId, receiver, user, exchangeKeyMutation, getParticipantKey]);

  return { encrypt, isEncrypting, error };
}


