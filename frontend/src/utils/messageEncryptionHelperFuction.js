// messageEncryption.js - Utility for key management (simplified mock version)
import { BASE_URL } from './baseUrls';
import { getDecryptedToken } from '@/utils/tokenStorage';


// NEW: Structured key storage format
// Store all keys for a conversation in a single object
export function storeConversationKeys(conversationId, userId, { privateKey, publicKey, otherKeys = [] }) {
  const key = `conversationKeys_${conversationId}_${userId}`;
  const keysData = {
    privateKey,
    publicKey,
    otherKeys, // Array of { userId, publicKey, keyId, keyVersion, isActive, storedAt }
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(key, JSON.stringify(keysData));
  console.log('💾 Stored conversation keys:', { 
    conversationId, 
    userId, 
    hasPrivateKey: !!privateKey,
    hasPublicKey: !!publicKey,
    otherKeysCount: otherKeys.length
  });
}

// Get all keys for a conversation
export function getConversationKeys(conversationId, userId) {
  const key = `conversationKeys_${conversationId}_${userId}`;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('❌ Error getting conversation keys:', error);
    return null;
  }
}

// Update other user's keys in the conversation keys object
export function updateOtherUserKeys(conversationId, userId, newOtherKeys) {
  const existingKeys = getConversationKeys(conversationId, userId) || {
    privateKey: null,
    publicKey: null,
    otherKeys: []
  };
  
  existingKeys.otherKeys = newOtherKeys;
  existingKeys.updatedAt = new Date().toISOString();
  
  const key = `conversationKeys_${conversationId}_${userId}`;
  localStorage.setItem(key, JSON.stringify(existingKeys));
  console.log('💾 Updated other user keys:', { 
    conversationId, 
    userId, 
    otherKeysCount: newOtherKeys.length 
  });
}

// Add or update a single participant's key in otherKeys array
export function addOrUpdateParticipantKey(conversationId, currentUserId, participantUserId, publicKey, keyId, keyVersion) {
  const keysData = getConversationKeys(conversationId, currentUserId) || {
    privateKey: null,
    publicKey: null,
    otherKeys: []
  };
  
  // Find if participant already has keys stored
  let participantKeys = keysData.otherKeys.find(k => k.userId === participantUserId);
  
  if (!participantKeys) {
    // Create new entry for this participant
    participantKeys = {
      userId: participantUserId,
      keys: []
    };
    keysData.otherKeys.push(participantKeys);
  }
  
  // Mark all existing keys as inactive
  participantKeys.keys.forEach(k => k.isActive = false);
  
  // Add new key
  participantKeys.keys.push({
    publicKey,
    keyId: keyId || `key_${Date.now()}`,
    keyVersion: keyVersion || (participantKeys.keys.length + 1),
    isActive: true,
    storedAt: new Date().toISOString()
  });
  
  // Keep only last 3 keys per participant
  if (participantKeys.keys.length > 3) {
    participantKeys.keys = participantKeys.keys.slice(-3);
  }
  
  // Save back
  storeConversationKeys(conversationId, currentUserId, keysData);
  
  console.log('💾 Added/Updated participant key:', {
    conversationId,
    participantUserId,
    keyVersion,
    totalKeys: participantKeys.keys.length
  });
}

// Get all keys for a specific participant (for fallback decryption)
export function getParticipantAllKeys(conversationId, currentUserId, participantUserId) {
  const keysData = getConversationKeys(conversationId, currentUserId);
  if (!keysData || !keysData.otherKeys) return [];
  
  const participantKeys = keysData.otherKeys.find(k => k.userId === participantUserId);
  if (!participantKeys || !participantKeys.keys) return [];
  
  // Return sorted by version (newest first)
  return participantKeys.keys.sort((a, b) => (b.keyVersion || 0) - (a.keyVersion || 0));
}

// Get active key for a participant
export function getParticipantActiveKey(conversationId, currentUserId, participantUserId) {
  const allKeys = getParticipantAllKeys(conversationId, currentUserId, participantUserId);
  const activeKey = allKeys.find(k => k.isActive);
  return activeKey ? activeKey.publicKey : (allKeys[0]?.publicKey || null);
}

// LEGACY FUNCTIONS - Keep for backward compatibility, but redirect to new structure

// Helper to store private key in localStorage
export function storePrivateKey(conversationId, userId, privateKey) {
  const key = `privateKey_${conversationId}_${userId}`;
  console.warn('⚠️ STORING PRIVATE KEY:', { conversationId, userId, keyName: key });
  console.trace('Stack trace for private key storage:');
  localStorage.setItem(key, privateKey);
  
  // Also update in new structure
  const keysData = getConversationKeys(conversationId, userId) || {
    publicKey: null,
    otherKeys: []
  };
  keysData.privateKey = privateKey;
  storeConversationKeys(conversationId, userId, keysData);
}

// Helper to get private key from localStorage
export function getPrivateKey(conversationId, userId) {
  // Try new structure first
  const keysData = getConversationKeys(conversationId, userId);
  if (keysData?.privateKey) return keysData.privateKey;
  
  // Fallback to legacy
  const key = `privateKey_${conversationId}_${userId}`;
  return localStorage.getItem(key);
}

// Helper to store current user's public key in localStorage
export function storeUserPublicKey(conversationId, userId, publicKey) {
  const key = `publicKey_${conversationId}_${userId}`;
  localStorage.setItem(key, publicKey);
  
  // Also update in new structure
  const keysData = getConversationKeys(conversationId, userId) || {
    privateKey: null,
    otherKeys: []
  };
  keysData.publicKey = publicKey;
  storeConversationKeys(conversationId, userId, keysData);
}

// Helper to get current user's public key from localStorage
export function getUserPublicKey(conversationId, userId) {
  // Try new structure first
  const keysData = getConversationKeys(conversationId, userId);
  if (keysData?.publicKey) return keysData.publicKey;
  
  // Fallback to legacy
  const key = `publicKey_${conversationId}_${userId}`;
  return localStorage.getItem(key);
}

// Helper to check if keys exist for a conversation
export function hasKeys(conversationId, userId) {
  // Check new structured storage first
  const keys = getConversationKeys(conversationId, userId);
  if (keys && keys.privateKey) {
    return true;
  }
  
  // Fallback to legacy storage
  return !!getPrivateKey(conversationId, userId);
}

// Helper to store participant's public key in localStorage (DEPRECATED - use addOrUpdateParticipantKey directly)
// Keeping for backward compatibility but always uses new structured storage
export function storeParticipantPublicKey(conversationId, participantUserId, publicKey, keyId = null, keyVersion = null, currentUserId = null) {
  if (!currentUserId) {
    console.warn('⚠️ storeParticipantPublicKey called without currentUserId. This is deprecated. Key will not be stored.');
    return;
  }
  
  // Always use new structured storage
  addOrUpdateParticipantKey(conversationId, currentUserId, participantUserId, publicKey, keyId, keyVersion);
}

// Helper to get participant's active public key from localStorage (DEPRECATED)
export function getParticipantPublicKey(conversationId, participantUserId, currentUserId = null) {
  if (!currentUserId) {
    console.warn('⚠️ getParticipantPublicKey called without currentUserId. This is deprecated.');
    return null;
  }
  
  // Always use new structure
  return getParticipantActiveKey(conversationId, currentUserId, participantUserId);
}

// Helper to get ALL participant's keys for fallback decryption (DEPRECATED)
export function getAllParticipantKeys(conversationId, participantUserId, currentUserId = null) {
  if (!currentUserId) {
    console.warn('⚠️ getAllParticipantKeys called without currentUserId. This is deprecated.');
    return [];
  }
  
  // Always use new structure
  return getParticipantAllKeys(conversationId, currentUserId, participantUserId);
}

// Helper to check if participant's public key exists in localStorage
export function hasParticipantPublicKey(conversationId, participantUserId) {
  return !!getParticipantPublicKey(conversationId, participantUserId);
}


// Helper to ensure participant's public key exists in localStorage (refetch if missing)
export async function ensureParticipantKeyInStorage(conversationId, participantUserId, currentUserId) {
  // CRITICAL: Never fetch or store our own key as "other user"
  if (currentUserId && participantUserId === currentUserId) {
    console.warn(`⚠️ Skipping key fetch for own user ID: ${participantUserId}`);
    return true; // Not an error, just skip
  }

  // Check if key exists in localStorage
  if (!hasParticipantPublicKey(conversationId, participantUserId)) {
    
    // Refetch from backend and save to localStorage
    const publicKey = await fetchParticipantKey(conversationId, participantUserId);
    
    if (publicKey) {
      return true; // Key is now in localStorage
    } else {
      return false; // Failed to get key
    }
  }
  
  // Key already exists
  return true;
}

// Helper to ensure all conversation participants' keys are in localStorage
export async function ensureAllConversationKeysInStorage(conversationId, participantUserIds, currentUserId) {
  const results = [];
  
  for (const userId of participantUserIds) {
    // Skip if this is the current user's ID
    if (currentUserId && userId === currentUserId) {
      console.warn(`⚠️ Skipping key storage for own user ID: ${userId}`);
      continue;
    }
    
    const success = await ensureParticipantKeyInStorage(conversationId, userId, currentUserId);
    results.push({ userId, success });
  }
  
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.warn(`Failed to ensure keys for users: ${failed.map(r => r.userId).join(', ')}`);
  }
  
  return results;
}

// Helper to clear all keys for a conversation (useful when leaving conversation)
export function clearConversationKeys(conversationId, currentUserId) {
  // Get all localStorage keys
  const keys = Object.keys(localStorage);
  
  // Remove private key for current user
  const privateKeyPattern = new RegExp(`^privateKey_${conversationId}_${currentUserId}$`);
  keys.forEach(key => {
    if (privateKeyPattern.test(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove current user's public key
  const userPublicKeyPattern = new RegExp(`^publicKey_${conversationId}_${currentUserId}$`);
  keys.forEach(key => {
    if (userPublicKeyPattern.test(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove all other users' public keys for this conversation
  const publicKeyPattern = new RegExp(`^otherUser_publicKey_${conversationId}_`);
  keys.forEach(key => {
    if (publicKeyPattern.test(key)) {
      localStorage.removeItem(key);
    }
  });
}

// Helper to get participant's public key (checks localStorage first, then fetches from backend if needed)
// Now supports socket-first fetching with API fallback
export async function getOrFetchParticipantKey(conversationId, participantUserId, currentUserId, forceRefresh = false, socket = null) {
  // CRITICAL: Never fetch our own key as "other user"
  if (currentUserId && participantUserId === currentUserId) {
    console.warn(`⚠️ Attempted to fetch own key as participant for userId: ${participantUserId}`);
    return null;
  }

  let publicKey = null;

  // First check localStorage (unless force refresh)
  if (!forceRefresh) {
    publicKey = getParticipantPublicKey(conversationId, participantUserId);
    if (publicKey) {
      console.log(`✅ Using cached key for participant ${participantUserId}`);
      return publicKey;
    }
  } else {
    console.log(`🔄 Force refreshing key for participant ${participantUserId}`);
  }
  
  // Try socket-first if available, then fallback to API
  if (socket && socket.connected) {
    const { fetchParticipantKeyViaSocket } = await import('./socketEncryptionUtils.js');
    publicKey = await fetchParticipantKeyViaSocket(socket, conversationId, participantUserId, currentUserId, true);
    if (publicKey) {
      console.log('✅ Fetched key via socket');
      return publicKey;
    }
  }
  
  // Fallback to API
  console.log('🔄 Fetching key via API (socket unavailable or failed)');
  publicKey = await fetchParticipantKey(conversationId, participantUserId, currentUserId);
  return publicKey;
}

// Helper to fetch participant's public key from backend
export async function fetchParticipantKey(conversationId, userId, currentUserId) {
  // CRITICAL: Never fetch our own key
  if (currentUserId && userId === currentUserId) {
    console.warn(`⚠️ Blocked fetching own key as participant for userId: ${userId}`);
    return null;
  }

  try {
    const token = getDecryptedToken("accessToken");
    const response = await fetch(
      `${BASE_URL}conversations/${conversationId}/keys`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch key");
    const data = await response.json();
    // The backend may return either a single publicKey (legacy) or an array at data.keys
    // Example array response: data.data.keys = [ { userId, publicKey, ... }, ... ]
    console.log("Fetched participant key response:", data);

    let publicKey = null;

    // Try legacy single-key location
    if (data && data.data && data.data.publicKey) {
      publicKey = data.data.publicKey;
    }

    // If not present, try keys array and find the requested userId
    if (!publicKey && data && data.data && Array.isArray(data.data.keys)) {
      const found = data.data.keys.find(k => k && String(k.userId) === String(userId));
      if (found && found.publicKey) {
        publicKey = found.publicKey;
        // Store with keyId and version if available
        if (userId !== currentUserId) {
          storeParticipantPublicKey(
            conversationId, 
            userId, 
            found.publicKey,
            found.keyId,
            found.keyVersion
          );
        }
        return publicKey;
      }
    }

    // As a last resort, if there's exactly one key in keys array and userId wasn't provided,
    // pick that key (useful for 1:1 flows where frontend asked for other participant but passed no userId)
    if (!publicKey && data && data.data && Array.isArray(data.data.keys) && data.data.keys.length === 1) {
      const found = data.data.keys[0];
      publicKey = found.publicKey;
      // Store with keyId and version if available
      if (found.userId && found.userId !== currentUserId) {
        storeParticipantPublicKey(
          conversationId, 
          found.userId, 
          found.publicKey,
          found.keyId,
          found.keyVersion
        );
      }
    }

    // Legacy fallback: Store the fetched key in localStorage for future use (if we found it)
    // DOUBLE CHECK: Don't store if it's our own userId
    if (publicKey && userId !== currentUserId && !data?.data?.keyId) {
      // Only store without keyId/version if we haven't already stored above
      storeParticipantPublicKey(conversationId, userId, publicKey);
    } else if (userId === currentUserId) {
      console.warn(`⚠️ Blocked storing own key as participant for userId=${userId}`);
    } else if (!publicKey) {
      console.warn(`No public key found in response for userId=${userId}`);
    }

    return publicKey;
  } catch (error) {
    console.error("Fetch participant key error:", error);
    return null;
  }
}

// Helper to fetch all participants' public keys for a conversation
export async function fetchConversationKeys(conversationId, currentUserId) {
  try {
    // Debug: print stack to identify who is calling this function
    try {
      // eslint-disable-next-line no-console
      console.log(`fetchConversationKeys called for conversationId=${conversationId}, currentUserId=${currentUserId}`);
      // Print a compact stack to help trace the caller in the browser console
      // (new Error()).stack is more compact than console.trace in some environments
      // and works well when viewing devtools network initiator + console.
      // eslint-disable-next-line no-console
      console.log((new Error()).stack.split('\n').slice(1, 6).join('\n'));
    } catch (e) {
      // ignore debugging errors
    }

    // Simple in-memory throttle to avoid repeated immediate calls (helps during debugging)
    if (!globalThis.__fetchConversationKeysLast) globalThis.__fetchConversationKeysLast = {};
    const last = globalThis.__fetchConversationKeysLast[conversationId] || 0;
    const now = Date.now();
    // If called again within 500ms for same conversation, skip to reduce noise
    if (now - last < 500) {
      // eslint-disable-next-line no-console
      console.log(`fetchConversationKeys: throttled repeated call for ${conversationId}`);
      return [];
    }
    globalThis.__fetchConversationKeysLast[conversationId] = now;

    const token = getDecryptedToken("accessToken");
    const response = await fetch(
      `${BASE_URL}conversations/${conversationId}/keys`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );
    console.log("Fetch conversation keys response:", response);
    if (!response.ok) throw new Error("Failed to fetch conversation keys");
    const data = await response.json();
    const keys = data.data.keys || []; // Assuming the response has data.keys as array of {userId, publicKey, ...}
    
    console.log('🔑 Fetched conversation keys:', keys.map(k => ({ userId: k.userId, publicKeyPreview: k.publicKey?.substring(0, 20) + '...' })));
    
    // Store all fetched keys in localStorage for future use
    // CRITICAL: Only store OTHER participants' keys, NOT our own!
    keys.forEach(key => {
      if (key.userId && key.publicKey) {
        // SKIP if this is the current user's own key
        if (currentUserId && String(key.userId) === String(currentUserId)) {
          console.warn(`⚠️ Skipping storage of own key for userId: ${key.userId}`);
          return;
        }
        console.log(`  → Storing key for userId: ${key.userId}`);
        
        // Use new structured storage
        if (key.keys && Array.isArray(key.keys)) {
          // Backend sent multiple keys for this participant
          key.keys.forEach(k => {
            addOrUpdateParticipantKey(
              conversationId, 
              currentUserId, 
              key.userId, 
              k.publicKey, 
              k.keyId, 
              k.keyVersion
            );
          });
        } else {
          // Legacy: single key
          storeParticipantPublicKey(
            conversationId, 
            key.userId, 
            key.publicKey,
            key.keyId,
            key.keyVersion,
            currentUserId // Pass currentUserId to use new storage
          );
        }
      }
    });
    
    return keys;
  } catch (error) {
    console.error("Fetch conversation keys error:", error);
    return [];
  }
}

// Helper to exchange public key with backend
export async function exchangePublicKey(conversationId, publicKey) {
  try {
    const token = getDecryptedToken("accessToken");
    // Send as JSON so express.json() on the server can parse req.body.publicKey
    const response = await fetch(`${BASE_URL}conversations/${conversationId}/key-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ publicKey }),
    });
    if (!response.ok) throw new Error('Failed to exchange key');
    return await response.json();
  } catch (error) {
    console.error('Exchange key error:', error);
    throw error;
  }
}

// ===== Own Message Plaintext Storage (Encrypted) =====
// Store plaintext of own sent messages organized by conversation (encrypted with own key)
export async function storeOwnMessagePlaintext(conversationId, messageId, plaintext, userId) {
  const key = `ownMessages_${conversationId}`;
  try {
    let dataToStore = plaintext; // Default to plaintext as fallback
    
    // Try to encrypt plaintext with own key before storing
    try {
      const { encryptForOwnStorage } = await import('./messageEncryption.js');
      const encryptedPlaintext = await encryptForOwnStorage(conversationId, plaintext, userId);
      dataToStore = encryptedPlaintext;
      console.log('🔒 Encrypted own message for storage');
    } catch (encryptError) {
      console.warn('⚠️ Encryption failed, storing as plaintext:', encryptError);
      // dataToStore remains as plaintext
    }
    
    // Get existing messages for this conversation
    const existing = localStorage.getItem(key);
    const messages = existing ? JSON.parse(existing) : [];
    
    // Check if message already exists (avoid duplicates)
    const existingIndex = messages.findIndex(msg => msg.messageId === messageId);
    if (existingIndex !== -1) {
      messages[existingIndex].data = dataToStore;
      messages[existingIndex].updatedAt = new Date().toISOString();
    } else {
      messages.push({
        messageId,
        data: dataToStore, // Can be encrypted or plaintext
        createdAt: new Date().toISOString()
      });
    }
    
    localStorage.setItem(key, JSON.stringify(messages));
    console.log(`💾 Stored own message for conversation ${conversationId}:`, { messageId, count: messages.length });
  } catch (error) {
    console.error('❌ Failed to store own message:', error);
    throw error;
  }
}

// Retrieve and decrypt plaintext of own sent message from conversation array
export async function getOwnMessagePlaintext(conversationId, messageId, userId) {
  const key = `ownMessages_${conversationId}`;
  try {
    const existing = localStorage.getItem(key);
    if (!existing) {
      console.log('📭 No stored messages for conversation:', conversationId);
      return null;
    }
    
    const messages = JSON.parse(existing);
    const message = messages.find(msg => msg.messageId === messageId);
    if (!message?.data) {
      console.log('📭 Message not found in storage:', messageId);
      return null;
    }
    
    // Try to decrypt if it's encrypted, otherwise return as-is (plaintext fallback)
    try {
      const { decryptFromOwnStorage } = await import('./messageEncryption.js');
      const decrypted = await decryptFromOwnStorage(conversationId, message.data, userId);
      console.log('🔓 Decrypted own message from storage');
      return decrypted;
    } catch (decryptError) {
      console.warn('⚠️ Decryption failed, returning data as-is:', decryptError);
      return message.data; // Return as-is (might be plaintext)
    }
  } catch (error) {
    console.error('❌ Failed to retrieve own message:', error);
    return null;
  }
}

// Get all own messages for a conversation
export function getAllOwnMessagesForConversation(conversationId) {
  const key = `ownMessages_${conversationId}`;
  try {
    const existing = localStorage.getItem(key);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Failed to get own messages:', error);
    return [];
  }
}

// Clean up old own message plaintexts for a conversation (keep only recent N messages)
export function cleanupOldOwnMessages(conversationId, keepCount = 100) {
  const key = `ownMessages_${conversationId}`;
  try {
    const existing = localStorage.getItem(key);
    if (!existing) return;
    
    const messages = JSON.parse(existing);
    if (messages.length <= keepCount) return;
    
    // Sort by createdAt descending and keep only recent ones
    messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const trimmed = messages.slice(0, keepCount);
    
    localStorage.setItem(key, JSON.stringify(trimmed));
    console.log(`🧹 Cleaned up old messages for conversation ${conversationId}: kept ${trimmed.length}, removed ${messages.length - trimmed.length}`);
  } catch (error) {
    console.error('Failed to cleanup old messages:', error);
  }
}

// Remove all own messages for a conversation (e.g., when leaving/deleting conversation)
export function clearOwnMessagesForConversation(conversationId) {
  const key = `ownMessages_${conversationId}`;
  try {
    localStorage.removeItem(key);
    console.log(`🗑️ Cleared all own messages for conversation ${conversationId}`);
  } catch (error) {
    console.error('Failed to clear own messages:', error);
  }
}
