import { useState, useEffect } from 'react';
import { decryptMessage as decryptMessageECDH } from '@/utils/messageEncryption';
import { decryptMessage as decryptMessageV1 } from '@/utils/messageEncryptionV1';
import { getOrFetchParticipantKey } from '@/utils/messageEncryptionHelperFuction';

/**
 * Custom hook to handle message decryption for all encryption methods
 * @param {string} messageText - The message text to decrypt
 * @param {string} conversationId - The conversation ID
 * @param {string} senderId - The sender's user ID
 * @param {string} currentUserId - The current user's ID
 * @param {boolean} skipOwnMessages - Whether to skip decrypting own messages (default: true)
 * @returns {Object} { decryptedText, decryptError, isEncrypted }
 */
export const useMessageDecryption = (messageText: any, conversationId: any, senderId: any, currentUserId: any, skipOwnMessages: boolean = true, encryptionMethodOverride?: string): any => {
    const [decryptedText, setDecryptedText] = useState<any>(null);
    const [decryptError, setDecryptError] = useState<any>(null);

  // Helper function to detect if text is encrypted
  const isEncryptedMessage = (text) => {
    if (!text || typeof text !== 'string') return false;
    
    // Check for SMTE format (should already be decrypted by server, but guard)
    if (text.startsWith('SMTE:') && text.split(':').length === 5) return true;

    // Check for ECDH format (JSON with ciphertext)
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.ciphertext) return true;
    } catch {}
    
    // Check for backend encryption format (salt:iv:authTag:ciphertext with 4 parts)
    const parts = text.split(':');
    if (parts.length === 4 && parts.every(p => p.length > 10)) return true;
    
    // Check for V1 encryption (long base64-like string)
    if (text.length > 50 && /^[A-Za-z0-9+/=]+$/.test(text)) return true;
    
    return false;
  };

  useEffect(() => {
    let isMounted = true;

    const tryDecrypt = async () => {
      setDecryptedText(null);
      setDecryptError(null);

      if (!messageText || !conversationId || !isEncryptedMessage(messageText)) {
        return;
      }

      // Skip if it's our own message and skipOwnMessages is true
      if (skipOwnMessages && String(senderId) === String(currentUserId)) {
        console.log('⏭️ Skipping decryption of own message');
        return;
      }

      try {
        // Use override (passed directly from API response) when available,
        // otherwise fall back to localStorage — avoids the race on first render.
        const method = encryptionMethodOverride
          || localStorage.getItem(`encryptionMethod_${conversationId}`)
          || 'Backend';

        // Handle SMTE transport-encrypted (server should have decrypted, but just in case)
        if (method === 'Backend' && typeof messageText === 'string' && messageText.startsWith('SMTE:')) {
          console.log('🔐 SMTE encrypted message detected (server should have decrypted)');
          if (isMounted) setDecryptError('[Transport encrypted - waiting for server]');
          return;
        }

        // Handle Backend encryption
        if (method === 'Backend' && typeof messageText === 'string') {
          const parts = messageText.split(':');
          if (parts.length === 4) {
            console.log('🔐 Backend encrypted message detected');
            if (isMounted) setDecryptError('[Backend encrypted - waiting for server]');
            return;
          }
        }

        // Handle V1 decryption
        if (method === 'V1' && messageText.length > 20) {
          try {
            const decrypted = decryptMessageV1(messageText, conversationId);
            if (isMounted && decrypted && decrypted !== messageText) {
              console.log('🔓 Decrypted with V1 method');
              setDecryptedText(decrypted);
            }
          } catch (err) {
            console.error('V1 Decryption error:', err);
            if (isMounted) setDecryptError('Failed to decrypt with V1 method');
          }
          return;
        }

        // Handle ECDH decryption
        if (method === 'ECDH') {
          try {
            const payload = JSON.parse(messageText);
            if (payload && payload.ciphertext && payload.iv && payload.salt) {
              const fromId = senderId || payload.senderId;
              
              if (!fromId) {
                if (isMounted) setDecryptError('Encrypted message — sender unknown');
                return;
              }

              // Fetch participant key if needed
              await getOrFetchParticipantKey(conversationId, fromId, currentUserId);
              
              const decrypted = await decryptMessageECDH(
                conversationId,
                { ciphertext: payload.ciphertext, iv: payload.iv, salt: payload.salt },
                fromId,
                currentUserId
              );
              
              if (isMounted && decrypted) {
                console.log('🔓 Decrypted with ECDH method');
                setDecryptedText(decrypted);
              }
            }
          } catch (err) {
            console.error('ECDH Decryption error:', err);
            if (isMounted) setDecryptError('Failed to decrypt with ECDH method');
          }
        }
      } catch (error) {
        console.error('Message decryption error:', error);
        if (isMounted) setDecryptError('Decryption failed');
      }
    };

    tryDecrypt();

    return () => {
      isMounted = false;
    };
  }, [messageText, conversationId, senderId, currentUserId, skipOwnMessages, encryptionMethodOverride]);

  return {
    decryptedText,
    decryptError,
    isEncrypted: isEncryptedMessage(messageText)
  };
};
