// @ts-nocheck
/**
 * Conversation Key Exchange Workflow Handler
 * Manages the complete flow: Create conversation → Generate keys → Exchange keys
 */

import { 
  initializeConversationKeys, 
  getMyPublicKey
} from './messageEncryptionHelperFuction';

// Store for pending key exchanges
const pendingKeyExchanges = new Map();

/**
 * Handle key exchange after conversation is created or when user sends first message
 * @param {string} conversationId - The conversation ID (must exist)
 * @param {string} currentUserId - Current user's ID
 * @param {string} otherUserId - Other participant's ID
 * @param {Function} exchangeKeyMutation - RTK Query mutation for key exchange
 * @returns {Promise<Object>} - Result of key exchange
 */
export async function handleConversationKeyExchange(
  conversationId: any, 
  currentUserId: any, 
  otherUserId: any,
  exchangeKeyMutation: any
): Promise<any> {
  if (!conversationId) {
    throw new Error('Conversation ID is required for key exchange');
  }

  try {
    // Check if we already have keys for this conversation
    const existingKey = localStorage.getItem(`${conversationId}_myPublicKey`);
    
    if (existingKey) {
      console.log(`✅ Keys already exist for conversation: ${conversationId}`);
      return {
        success: true,
        action: 'existing',
        conversationId
      };
    }

    // Generate ECDH key pair for this conversation
    console.log(`🔑 Generating keys for conversation: ${conversationId}`);
    const keyPair = await initializeConversationKeys(conversationId);
    
    // Export public key to send to backend
    const publicKeyBase64 = await getMyPublicKey(conversationId);
    
    // Store our public key reference locally
    localStorage.setItem(`${conversationId}_myPublicKey`, publicKeyBase64);
    localStorage.setItem(`${conversationId}_myUserId`, currentUserId);
    
    // Send public key to backend
    console.log(`📤 Sending public key to backend for conversation: ${conversationId}`);
    const response = await exchangeKeyMutation({
      conversationId,
      publicKey: publicKeyBase64
    }).unwrap();
    
    console.log(`✅ Key exchange successful:`, response);
    
    return {
      success: true,
      action: 'created',
      conversationId,
      keyExchangeResponse: response
    };
    
  } catch (error) {
    console.error('❌ Key exchange failed:', error);
    return {
      success: false,
      error: error.message || 'Key exchange failed',
      conversationId
    };
  }
}

/**
 * Handle key exchange when conversation is created from scratch
 * This ensures keys are generated and exchanged immediately after conversation creation
 * @param {Object} params - Parameters object
 * @returns {Promise<Object>} - Result
 */
export async function handleNewConversationKeyExchange({
  conversationId,
  currentUserId,
  otherUserId,
  exchangeKeyMutation,
  onSuccess,
  onError
}: any): Promise<any> {
  try {
    if (!conversationId) {
      throw new Error('Cannot exchange keys: conversationId is missing');
    }

    const result = await handleConversationKeyExchange(
      conversationId,
      currentUserId,
      otherUserId,
      exchangeKeyMutation
    );

    if (result.success) {
      onSuccess && onSuccess(result);
    } else {
      onError && onError(result.error);
    }

    return result;
    
  } catch (error) {
    const errorMsg = error.message || 'Key exchange failed';
    onError && onError(errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Check if user has already exchanged keys for a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {boolean} - True if keys exist
 */
export function hasExchangedKeys(conversationId: any): boolean {
  if (!conversationId) return false;
  return !!localStorage.getItem(`${conversationId}_myPublicKey`);
}

/**
 * Queue a key exchange to be performed after conversation is created
 * @param {string} tempConversationId - Temporary ID
 * @param {Object} params - Exchange parameters
 */
export function queueKeyExchange(tempConversationId: any, params: any): void {
  pendingKeyExchanges.set(tempConversationId, params);
}

/**
 * Execute pending key exchange after conversation is created
 * @param {string} tempConversationId - Temporary ID
 * @param {string} realConversationId - Real conversation ID from backend
 */
export async function executePendingKeyExchange(tempConversationId: any, realConversationId: any): Promise<any> {
  const params = pendingKeyExchanges.get(tempConversationId);
  
  if (!params) {
    return { success: false, error: 'No pending key exchange found' };
  }

  pendingKeyExchanges.delete(tempConversationId);
  
  return await handleConversationKeyExchange(
    realConversationId,
    params.currentUserId,
    params.otherUserId,
    params.exchangeKeyMutation
  );
}

/**
 * Get other participant's user ID from conversation
 * @param {Object} conversation - Conversation object
 * @param {string} currentUserId - Current user's ID
 * @returns {string|null} - Other user's ID
 */
export function getOtherParticipantId(conversation: any, currentUserId: any): any {
  if (!conversation || !conversation.participants) {
    return null;
  }

  const participants = Array.isArray(conversation.participants) 
    ? conversation.participants 
    : [];

  const otherParticipant = participants.find(p => {
    const participantId = typeof p === 'object' ? p._id : p;
    return participantId !== currentUserId;
  });

  return otherParticipant 
    ? (typeof otherParticipant === 'object' ? otherParticipant._id : otherParticipant)
    : null;
}

/**
 * Clean up keys when conversation is deleted
 * @param {string} conversationId - Conversation ID
 */
export function cleanupConversationKeys(conversationId: any): void {
  if (!conversationId) return;

  const keysToRemove = [];
  
  // Find all keys related to this conversation
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(conversationId)) {
      keysToRemove.push(key);
    }
  }

  // Remove all found keys
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  console.log(`🧹 Cleaned up ${keysToRemove.length} keys for conversation: ${conversationId}`);
}