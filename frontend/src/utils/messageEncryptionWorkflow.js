/**
 * Simplified Message Encryption Workflow
 * Uses the clean ECDH implementation for seamless encryption
 */

import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
} from './messageEncryption';

import {
  storePrivateKey,
  storeUserPublicKey,
  getUserPublicKey,
  hasKeys,
  exchangePublicKey,
  getOrFetchParticipantKey,
} from './messageEncryptionHelperFuction';

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

// Initialize conversation keys if they don't exist
async function initializeConversationKeys(conversationId, userId) {
  if (!hasKeys(conversationId, userId)) {
    const { publicKey, privateKey } = await generateKeyPair();
    storePrivateKey(conversationId, userId, privateKey);
    storeUserPublicKey(conversationId, userId, publicKey);
    return { publicKey, privateKey };
  }
  return {
    publicKey: getUserPublicKey(conversationId, userId),
    privateKey: null // Don't expose private key
  };
}

/**
 * Prepare and encrypt a message for sending
 * @param {string} message - The message to encrypt
 * @param {string} conversationId - Conversation ID
 * @param {string} currentUserId - Current user's ID
 * @param {string} otherUserId - Other participant's ID
 * @param {Function} exchangeKeyMutation - RTK Query mutation to send public key
 * @param {Function} getParticipantKeyQuery - RTK Query to fetch other's public key
 * @returns {Promise<Object>} - Result with encrypted message
 */
export async function prepareAndEncryptMessage({
  message,
  conversationId,
  currentUserId,
  otherUserId,
  exchangeKeyMutation,
  getParticipantKeyQuery
}) {
  console.log('🔄 Starting simplified encryption workflow...', { conversationId, currentUserId, otherUserId });

  try {
    // STEP 1: Ensure we have our keys initialized
    const { publicKey } = await initializeConversationKeys(conversationId, currentUserId);

    // STEP 2: Exchange our public key with the server
    if (publicKey && exchangeKeyMutation) {
      try {
        await exchangePublicKey(conversationId, publicKey);
      } catch (error) {
        console.warn('⚠️ Public key exchange failed, but continuing...', error);
      }
    }

    // STEP 3: Ensure we have the other participant's public key
    if (otherUserId) {
      await getOrFetchParticipantKey(conversationId, otherUserId, currentUserId);
    }

    // STEP 4: Encrypt the message
    if (!otherUserId) {
      console.warn('⚠️ No other user ID provided, sending as plain text');
      return {
        success: true,
        encrypted: false,
        message: message,
        conversationId
      };
    }

    // Encrypt using the correct API: encryptMessage(conversationId, text, currentUserId, otherUserId)
    const encryptedPayload = await encryptMessage(conversationId, message, currentUserId, otherUserId);
    
    // Convert to JSON string for sending
    const encryptedMessage = JSON.stringify(encryptedPayload);

    return {
      success: true,
      encrypted: true,
      message: encryptedMessage,
      conversationId
    };

  } catch (error) {
    console.error('❌ Encryption workflow failed:', error);
    return {
      success: false,
      encrypted: false,
      message: message,
      error: error.message
    };
  }
}

/**
 * Decrypt a received message
 * @param {string} encryptedMessage - The encrypted message
 * @param {string} conversationId - Conversation ID
 * @param {string} senderUserId - Sender's user ID
 * @param {string} currentUserId - Current user's ID
 * @param {Function} getParticipantKeyQuery - RTK Query to fetch keys if needed
 * @returns {Promise<string>} - Decrypted message
 */
export async function prepareAndDecryptMessage({
  encryptedMessage,
  conversationId,
  senderUserId,
  currentUserId,
  getParticipantKeyQuery
}) {
  if (!isEncrypted(encryptedMessage)) {
    return encryptedMessage; // Already plain text
  }

  try {
    // Ensure we have our keys
    await initializeConversationKeys(conversationId, currentUserId);

    // Ensure we have the sender's public key
    await getOrFetchParticipantKey(conversationId, senderUserId, currentUserId);

    // Parse the encrypted payload
    const payload = JSON.parse(encryptedMessage);

    // Decrypt using the correct API: decryptMessage(conversationId, payload, senderUserId, currentUserId)
    const decrypted = await decryptMessage(conversationId, payload, senderUserId, currentUserId);

    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    return encryptedMessage; // Return encrypted on failure
  }
}

/**
 * Get encryption status for a conversation
 */
export function getEncryptionStatus(conversationId, otherUserId) {
  const hasMyPrivateKey = !!localStorage.getItem(`${conversationId}_privateKey`);
  const hasMyPublicKey = !!localStorage.getItem(`${conversationId}_publicKey`);
  const hasOtherPublicKey = !!localStorage.getItem(`${conversationId}_participant_${otherUserId}_publicKey`);

  return {
    ready: hasMyPrivateKey && hasOtherPublicKey,
    hasMyKeys: hasMyPrivateKey && hasMyPublicKey,
    hasOtherKey: hasOtherPublicKey,
    status: hasMyPrivateKey && hasOtherPublicKey ? 'ready' :
            hasMyPrivateKey ? 'partial' : 'none'
  };
}

/**
 * Clear keys for a conversation (for testing)
 */
export function clearConversationKeys(conversationId) {
  const keys = Object.keys(localStorage);
  const keysToRemove = keys.filter(key => key.startsWith(conversationId));

  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ Removed ${keysToRemove.length} keys for conversation ${conversationId}`);

  return { removed: keysToRemove.length, keys: keysToRemove };
}
