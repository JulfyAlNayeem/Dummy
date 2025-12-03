// hooks/useDecryptMessage.js
import { useState, useEffect } from 'react';
import { decryptMessage } from '@/utils/messageEncryption';
import { getOrFetchParticipantKey } from '@/utils/messageEncryptionHelperFuction';
import { useUserAuth } from '@/context-reducer/UserAuthContext';

// Helper to check if a message is encrypted (JSON with ciphertext, iv, salt)
function isEncrypted(message) {
  if (typeof message !== 'string') return false;
  try {
    const parsed = JSON.parse(message);
    return !!(parsed.ciphertext && parsed.iv && parsed.salt);
  } catch {
    return false;
  }
}

export function useDecryptMessage(encryptedMessage, conversationId, senderUserId) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUserAuth();

  useEffect(() => {
    const decrypt = async () => {
      if (!encryptedMessage) {
        setMessage('');
        return;
      }

      // Plain text - use directly
      if (!isEncrypted(encryptedMessage)) {
        setMessage(encryptedMessage);
        return;
      }

      // Encrypted - decrypt it
      setIsLoading(true);
      try {
        // Ensure we have the sender's public key
        await getOrFetchParticipantKey(conversationId, senderUserId, user?._id);
        
        // Parse the encrypted payload
        const payload = JSON.parse(encryptedMessage);
        
        // Decrypt using the consistent API
        const result = await decryptMessage(conversationId, payload, senderUserId, user?._id);
        setMessage(result);
      } catch (error) {
        console.error('Decryption failed:', error);
        setMessage(encryptedMessage);
      } finally {
        setIsLoading(false);
      }
    };

    decrypt();
  }, [encryptedMessage, conversationId, senderUserId, user?._id]);

  return { message, isLoading };
}