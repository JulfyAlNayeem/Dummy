/**
 * Socket-based encryption key management utilities
 * Provides real-time key exchange with API fallback
 */

import { addOrUpdateParticipantKey, getParticipantActiveKey } from './messageEncryptionHelperFuction';
import { fetchParticipantKey } from './messageEncryptionHelperFuction';

/**
 * Fetch participant keys via socket (real-time) with API fallback
 * @param {Object} socket - Socket.io client instance
 * @param {string} conversationId - Conversation ID
 * @param {string} currentUserId - Current user's ID
 * @param {boolean} forceRefresh - Force refresh from server
 * @returns {Promise<Array>} Array of participant keys
 */
export const fetchKeysViaSocket = (socket, conversationId, currentUserId, forceRefresh = false) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      console.warn('⚠️ Socket not connected, will fall back to API');
      resolve(null); // Null indicates fallback needed
      return;
    }

    const timeout = setTimeout(() => {
      console.warn('⏱️ Socket key fetch timeout, will fall back to API');
      resolve(null);
    }, 3000); // 3 second timeout

    socket.emit('encryption:fetch-keys', { conversationId }, (response) => {
      clearTimeout(timeout);

      if (response?.success && response?.data?.keys) {
        console.log('🔐 Successfully fetched keys via socket:', {
          conversationId,
          keysCount: response.data.keys.length
        });

        // Store keys in new structured format
        response.data.keys.forEach(keyData => {
          if (keyData.userId !== currentUserId) {
            // Backend provides keys array with all keys for this participant
            if (keyData.keys && Array.isArray(keyData.keys)) {
              // Store each key from the participant
              keyData.keys.forEach(key => {
                if (key.publicKey) {
                  addOrUpdateParticipantKey(
                    conversationId,
                    currentUserId,
                    keyData.userId,
                    key.publicKey,
                    key.keyId,
                    key.keyVersion
                  );
                }
              });
            } else {
              // Legacy format: single key
              addOrUpdateParticipantKey(
                conversationId,
                currentUserId,
                keyData.userId,
                keyData.publicKey,
                keyData.keyId,
                keyData.keyVersion
              );
            }
          }
        });

        resolve(response.data.keys);
      } else {
        console.warn('⚠️ Socket key fetch failed:', response?.message);
        resolve(null); // Indicate fallback needed
      }
    });
  });
};

/**
 * Fetch a single participant's key via socket with API fallback
 * @param {Object} socket - Socket.io client instance
 * @param {string} conversationId - Conversation ID
 * @param {string} participantUserId - Participant user ID
 * @param {string} currentUserId - Current user's ID
 * @param {boolean} forceRefresh - Force refresh from server
 * @returns {Promise<string|null>} Public key or null
 */
export const fetchParticipantKeyViaSocket = async (
  socket, 
  conversationId, 
  participantUserId, 
  currentUserId, 
  forceRefresh = false
) => {
  // Never fetch own key
  if (participantUserId === currentUserId) {
    console.warn('⚠️ Cannot fetch own key as participant');
    return null;
  }

  // Check localStorage first (unless force refresh)
  if (!forceRefresh) {
    const cachedKey = getParticipantActiveKey(conversationId, currentUserId, participantUserId);
    if (cachedKey) {
      console.log('✅ Using cached participant key from new structured storage');
      return cachedKey;
    }
  }

  // Try socket first
  const keys = await fetchKeysViaSocket(socket, conversationId, currentUserId, forceRefresh);
  
  if (keys && Array.isArray(keys)) {
    const targetKey = keys.find(k => k.userId === participantUserId);
    if (targetKey?.publicKey) {
      console.log('✅ Found participant key via socket');
      return targetKey.publicKey;
    }
  }

  // Fallback to API
  console.log('🔄 Falling back to API for participant key');
  return await fetchParticipantKey(conversationId, participantUserId, currentUserId);
};

/**
 * Verify if current user's key is stored on server via socket
 * @param {Object} socket - Socket.io client instance
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object>} Verification result {verified: boolean, keyInfo: Object}
 */
export const verifyKeyOnServer = (socket, conversationId) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      console.warn('⚠️ Socket not connected for key verification');
      resolve({ verified: false, message: 'Socket not connected' });
      return;
    }

    const timeout = setTimeout(() => {
      console.warn('⏱️ Key verification timeout');
      resolve({ verified: false, message: 'Verification timeout' });
    }, 5000);

    socket.emit('encryption:verify-key', { conversationId }, (response) => {
      clearTimeout(timeout);

      if (response?.success) {
        console.log('🔍 Key verification result:', {
          verified: response.verified,
          keyInfo: response.keyInfo
        });
        resolve({
          verified: response.verified,
          keyInfo: response.keyInfo,
          message: response.message
        });
      } else {
        console.warn('⚠️ Key verification failed:', response?.message);
        resolve({ 
          verified: false, 
          message: response?.message || 'Verification failed' 
        });
      }
    });
  });
};

/**
 * Broadcast new key generation to other participants via socket
 * @param {Object} socket - Socket.io client instance
 * @param {string} conversationId - Conversation ID
 * @param {string} publicKey - New public key
 * @param {string} keyId - Key identifier
 * @param {number} keyVersion - Key version number
 */
export const broadcastKeyGeneration = (socket, conversationId, publicKey, keyId, keyVersion) => {
  if (!socket || !socket.connected) {
    console.warn('⚠️ Socket not connected, cannot broadcast key generation');
    return;
  }

  socket.emit('encryption:key-generated', {
    conversationId,
    publicKey,
    keyId,
    keyVersion
  });

  console.log('📢 Broadcasted new key generation:', {
    conversationId,
    keyId,
    keyVersion
  });
};

/**
 * Listen for key updates from other participants
 * @param {Object} socket - Socket.io client instance
 * @param {Function} callback - Callback function when key is updated
 */
export const listenForKeyUpdates = (socket, callback) => {
  if (!socket) {
    console.warn('⚠️ Socket not available for listening to key updates');
    return () => {};
  }

  const handleKeyUpdate = (data) => {
    console.log('🔑 Received key update from participant:', {
      conversationId: data.conversationId,
      userId: data.userId,
      keyVersion: data.keyVersion
    });

    // Store the updated key in new structured format
    if (data.publicKey && data.conversationId && data.userId) {
      // We need currentUserId to store in new format, but we don't have it in listener
      // For backward compatibility, also store in legacy format
      // The fetchKeysViaSocket will update the new structure when keys are re-fetched
      addOrUpdateParticipantKey(
        data.conversationId,
        null, // Will be stored in legacy format without currentUserId
        data.userId,
        data.publicKey,
        data.keyId,
        data.keyVersion
      );
    }

    // Call the callback with update data
    if (callback && typeof callback === 'function') {
      callback(data);
    }
  };

  socket.on('encryption:key-updated', handleKeyUpdate);

  // Return cleanup function
  return () => {
    socket.off('encryption:key-updated', handleKeyUpdate);
  };
};

/**
 * Listen for encryption errors
 * @param {Object} socket - Socket.io client instance
 * @param {Function} callback - Callback function when error occurs
 */
export const listenForEncryptionErrors = (socket, callback) => {
  if (!socket) {
    console.warn('⚠️ Socket not available for listening to encryption errors');
    return () => {};
  }

  const handleError = (data) => {
    console.error('❌ Encryption socket error:', data.message);
    
    if (callback && typeof callback === 'function') {
      callback(data);
    }
  };

  socket.on('encryption:error', handleError);

  // Return cleanup function
  return () => {
    socket.off('encryption:error', handleError);
  };
};
