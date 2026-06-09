// @ts-nocheck
// messageEncryption.ts - Utility for key management (simplified)
import { BASE_URL } from './baseUrls';


// Simplified key storage format - store only active keys
export function storeConversationKeys(conversationId: any, userId: any, { privateKey, publicKey, otherKeys = [] }: any): void {
  const key = `conversationKeys_${conversationId}_${userId}`;
  const keysData = {
    privateKey,
    publicKey,
    otherKeys, // Array of { userId, publicKey, keyId, keyVersion, timestamp }
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(key, JSON.stringify(keysData));
}

// Get all keys for a conversation
export function getConversationKeys(conversationId: any, userId: any): any {
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
export function updateOtherUserKeys(conversationId: any, userId: any, newOtherKeys: any): void {
  const existingKeys = getConversationKeys(conversationId, userId) || {
    privateKey: null,
    publicKey: null,
    otherKeys: []
  };
  
  existingKeys.otherKeys = newOtherKeys;
  existingKeys.updatedAt = new Date().toISOString();
  
  const key = `conversationKeys_${conversationId}_${userId}`;
  localStorage.setItem(key, JSON.stringify(existingKeys));
}

// Add or update a single participant's key (simplified - single key only)
export function addOrUpdateParticipantKey(conversationId: any, currentUserId: any, participantUserId: any, publicKey: any, keyId: any, keyVersion: any): void {
  const keysData = getConversationKeys(conversationId, currentUserId) || {
    privateKey: null,
    publicKey: null,
    otherKeys: []
  };

  // Find participant and replace their key (single key, no history)
  const participantIndex = keysData.otherKeys.findIndex(k => k.userId === participantUserId);

  const newKey = {
    userId: participantUserId,
    publicKey,
    keyId: keyId || `key_${Date.now()}`,
    keyVersion: keyVersion || 1,
    timestamp: new Date().toISOString()
  };

  if (participantIndex >= 0) {
    // Replace existing key
    keysData.otherKeys[participantIndex] = newKey;
  } else {
    // Add new key
    keysData.otherKeys.push(newKey);
  }

  // Save back
  storeConversationKeys(conversationId, currentUserId, keysData);
}

// Get all keys for a specific participant (simplified - returns single key as array)
export function getParticipantAllKeys(conversationId: any, currentUserId: any, participantUserId: any): any {
  const keysData = getConversationKeys(conversationId, currentUserId);
  if (!keysData || !keysData.otherKeys) return [];
  
  const participantKey = keysData.otherKeys.find(k => k.userId === participantUserId);
  if (!participantKey) return [];
  
  // Return as array for compatibility with decryption logic
  return [participantKey];
}

// Get active key for a participant (simplified)
export function getParticipantActiveKey(conversationId: any, currentUserId: any, participantUserId: any): any {
  const keysData = getConversationKeys(conversationId, currentUserId);
  if (!keysData || !keysData.otherKeys) return null;
  
  const participantKey = keysData.otherKeys.find(k => k.userId === participantUserId);
  return participantKey?.publicKey || null;
}

// LEGACY FUNCTIONS - Keep for backward compatibility, but redirect to new structure

// Helper to store private key in localStorage
export function storePrivateKey(conversationId: any, userId: any, privateKey: any): void {
  // console.log('💾 Storing private key in new structure:', { conversationId, userId });
  
  // Only update in new structure (no longer storing in legacy privateKey_ format)
  const keysData = getConversationKeys(conversationId, userId) || {
    publicKey: null,
    otherKeys: []
  };
  keysData.privateKey = privateKey;
  storeConversationKeys(conversationId, userId, keysData);
}

// Helper to get private key from localStorage
export function getPrivateKey(conversationId: any, userId: any): any {
  // Try new structure first
  const keysData = getConversationKeys(conversationId, userId);
  if (keysData?.privateKey) return keysData.privateKey;
  
  // Fallback to legacy
  const key = `privateKey_${conversationId}_${userId}`;
  return localStorage.getItem(key);
}

// Helper to store current user's public key in localStorage
export function storeUserPublicKey(conversationId: any, userId: any, publicKey: any): void {
  // console.log('💾 Storing public key in new structure:', { conversationId, userId });
  
  // Only update in new structure (no longer storing in legacy publicKey_ format)
  const keysData = getConversationKeys(conversationId, userId) || {
    privateKey: null,
    otherKeys: []
  };
  keysData.publicKey = publicKey;
  storeConversationKeys(conversationId, userId, keysData);
}

// Helper to get current user's public key from localStorage
export function getUserPublicKey(conversationId: any, userId: any): any {
  // Try new structure first
  const keysData = getConversationKeys(conversationId, userId);
  if (keysData?.publicKey) return keysData.publicKey;
  
  // Fallback to legacy
  const key = `publicKey_${conversationId}_${userId}`;
  return localStorage.getItem(key);
}

// Helper to check if keys exist for a conversation
export function hasKeys(conversationId: any, userId: any): boolean {
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
export function storeParticipantPublicKey(conversationId: any, participantUserId: any, publicKey: any, keyId: any = null, keyVersion: any = null, currentUserId: any = null): void {
  if (!currentUserId) {
    console.warn('⚠️ storeParticipantPublicKey called without currentUserId. This is deprecated. Key will not be stored.');
    return;
  }
  
  // Always use new structured storage
  addOrUpdateParticipantKey(conversationId, currentUserId, participantUserId, publicKey, keyId, keyVersion);
}

// Helper to get participant's active public key from localStorage (DEPRECATED)
export function getParticipantPublicKey(conversationId: any, participantUserId: any, currentUserId: any = null): any {
  if (!currentUserId) {
    console.warn('⚠️ getParticipantPublicKey called without currentUserId. This is deprecated.');
    return null;
  }
  
  // Always use new structure
  return getParticipantActiveKey(conversationId, currentUserId, participantUserId);
}

// Helper to get ALL participant's keys for fallback decryption (DEPRECATED)
export function getAllParticipantKeys(conversationId: any, participantUserId: any, currentUserId: any = null): any {
  if (!currentUserId) {
    console.warn('⚠️ getAllParticipantKeys called without currentUserId. This is deprecated.');
    return [];
  }
  
  // Always use new structure
  return getParticipantAllKeys(conversationId, currentUserId, participantUserId);
}

// Helper to check if participant's public key exists in localStorage
export function hasParticipantPublicKey(conversationId: any, participantUserId: any): boolean {
  return !!getParticipantPublicKey(conversationId, participantUserId);
}


// Helper to ensure participant's public key exists in localStorage (refetch if missing)
export async function ensureParticipantKeyInStorage(conversationId: any, participantUserId: any, currentUserId: any): Promise<void> {
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
export async function ensureAllConversationKeysInStorage(conversationId: any, participantUserIds: any, currentUserId: any): Promise<void> {
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
export function clearConversationKeys(conversationId: any, currentUserId: any): void {
  // console.log('🗑️ Clearing conversation keys:', { conversationId, currentUserId });
  
  // Remove the new structured keys
  const conversationKeysKey = `conversationKeys_${conversationId}_${currentUserId}`;
  localStorage.removeItem(conversationKeysKey);
  
  // Note: Legacy keys (privateKey_, publicKey_, otherUser_publicKey_) are no longer created by the app
  // but may exist from old data. They can be manually cleaned up if needed.
}

// Helper to get participant's public key (checks localStorage first, then fetches from backend if needed)
// Now supports socket-first fetching with API fallback
export async function getOrFetchParticipantKey(conversationId: any, participantUserId: any, currentUserId: any, forceRefresh: boolean = false, socket: any = null): Promise<any> {
  // CRITICAL: Never fetch our own key as "other user"
  if (currentUserId && participantUserId === currentUserId) {
    console.warn(`⚠️ Attempted to fetch own key as participant for userId: ${participantUserId}`);
    return null;
  }

  let publicKey = null;
  const KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  // First check localStorage (unless force refresh)
  if (!forceRefresh) {
    publicKey = getParticipantPublicKey(conversationId, participantUserId, currentUserId);
    
    if (publicKey) {
      // Check if key is stale (older than 5 minutes)
      const keysData = getConversationKeys(conversationId, currentUserId);
      const participantKeys = keysData?.otherKeys?.find(k => k.userId === participantUserId);
      const activeKey = participantKeys?.keys?.find(k => k.isActive);
      
      if (activeKey && activeKey.storedAt) {
        const keyAge = Date.now() - new Date(activeKey.storedAt).getTime();
        if (keyAge > KEY_CACHE_TTL) {
          console.log(`⏰ Cached key is stale (${Math.round(keyAge / 1000)}s old), refreshing for participant ${participantUserId}`);
          forceRefresh = true; // Auto-refresh stale key
        } else {
          console.log(`✅ Using cached key for participant ${participantUserId} (${Math.round(keyAge / 1000)}s old)`);
          return publicKey;
        }
      } else {
        console.log(`✅ Using cached key for participant ${participantUserId}`);
        return publicKey;
      }
    }
  } else {
    console.log(`🔄 Force refreshing key for participant ${participantUserId}`);
  }
  
  // Try socket-first if available, then fallback to API
  if (socket && socket.connected) {
    const { fetchParticipantKeyViaSocket } = await import('./socketEncryptionUtils.ts');
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
export async function fetchParticipantKey(conversationId: any, userId: any, currentUserId: any): Promise<any> {
  // CRITICAL: Never fetch our own key
  if (currentUserId && userId === currentUserId) {
    console.warn(`⚠️ Blocked fetching own key as participant for userId: ${userId}`);
    return null;
  }

  try {
    const response = await fetch(
      `${BASE_URL}conversations/${conversationId}/keys`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    if (!response.ok) throw new Error("Failed to fetch key");
    const data = await response.json();
    // The backend may return either a single publicKey (legacy) or an array at data.keys
    // Example array response: data.data.keys = [ { userId, publicKey, ... }, ... ]
    console.log("Fetched participant key response:", data);
    console.log(`🔍 Looking for userId: ${userId} in fetched keys`);

    let publicKey = null;

    // Try legacy single-key location
    if (data && data.data && data.data.publicKey) {
      publicKey = data.data.publicKey;
      console.log(`✅ Found legacy publicKey: ${publicKey}`);
    }

    // If not present, try keys array and find the requested userId
    if (!publicKey && data && data.data && Array.isArray(data.data.keys)) {
      console.log(`🔍 Searching in ${data.data.keys.length} keys for userId: ${userId}`);
      data.data.keys.forEach((k, idx) => {
        console.log(`  Key ${idx}: userId=${k?.userId}, hasPublicKey=${!!k?.publicKey}, keyVersion=${k?.keyVersion}, isActive=${k?.isActive}`);
      });
      
      const found = data.data.keys.find(k => k && String(k.userId) === String(userId));
      if (found && found.publicKey) {
        publicKey = found.publicKey;
        console.log(`✅ Found publicKey for userId ${userId}: ${publicKey}, version: ${found.keyVersion}, isActive: ${found.isActive}`);
        // Store with keyId and version if available
        if (userId !== currentUserId) {
          storeParticipantPublicKey(
            conversationId, 
            userId, 
            found.publicKey,
            found.keyId,
            found.keyVersion,
            currentUserId
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
          found.keyVersion,
          currentUserId
        );
      }
    }

    // Legacy fallback: Store the fetched key in localStorage for future use (if we found it)
    // DOUBLE CHECK: Don't store if it's our own userId
    if (publicKey && userId !== currentUserId && !data?.data?.keyId) {
      // Only store without keyId/version if we haven't already stored above
      storeParticipantPublicKey(conversationId, userId, publicKey, null, null, currentUserId);
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
export async function fetchConversationKeys(conversationId: any, currentUserId: any): Promise<any> {
  try {
    // Debug: print stack to identify who is calling this function
    // try {
    //   console.log(`fetchConversationKeys called for conversationId=${conversationId}, currentUserId=${currentUserId}`);
    //   console.log((new Error()).stack.split('\n').slice(1, 6).join('\n'));
    // } catch (e) {
    //   // ignore debugging errors
    // }

    // Simple in-memory throttle to avoid repeated immediate calls (helps during debugging)
    if (!globalThis.__fetchConversationKeysLast) globalThis.__fetchConversationKeysLast = {};
    const last = globalThis.__fetchConversationKeysLast[conversationId] || 0;
    const now = Date.now();
    // If called again within 500ms for same conversation, skip to reduce noise
    if (now - last < 500) {
      // console.log(`fetchConversationKeys: throttled repeated call for ${conversationId}`);
      return [];
    }
    globalThis.__fetchConversationKeysLast[conversationId] = now;

    const response = await fetch(
      `${BASE_URL}conversations/${conversationId}/keys`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    // console.log("Fetch conversation keys response:", response);
    if (!response.ok) throw new Error("Failed to fetch conversation keys");
    const data = await response.json();
    const keys = data.data?.keys || []; // Assuming the response has data.keys as array of {userId, publicKey, ...}
    
    // Validate that keys is an array
    if (!Array.isArray(keys)) {
      console.error('❌ Invalid keys response format:', keys);
      throw new Error('Invalid keys response format from server');
    }
    
    // console.log('🔑 Fetched conversation keys:', keys.map(k => ({ userId: k?.userId, publicKeyPreview: k?.publicKey?.substring(0, 20) + '...' })));
    
    // Store all fetched keys in localStorage for future use
    // CRITICAL: Only store OTHER participants' keys, NOT our own!
    keys.forEach(key => {
      try {
        if (key && key.userId && key.publicKey) {
          // SKIP if this is the current user's own key
          if (currentUserId && String(key.userId) === String(currentUserId)) {
            return;
          }
          
          // Single key format (no version history)
          if (key.publicKey) {
            addOrUpdateParticipantKey(
              conversationId, 
              currentUserId, 
              key.userId, 
              key.publicKey, 
              key.keyId, 
              key.keyVersion
            );
          }
        }
      } catch (error) {
        console.error(`❌ Error processing key for userId ${key?.userId}:`, error);
      }
    });
    
    return keys;
  } catch (error) {
    console.error("Fetch conversation keys error:", error);
    return [];
  }
}

// Helper to exchange public key with backend
export async function exchangePublicKey(conversationId: any, publicKey: any): Promise<any> {
  try {
    // Send as JSON so express.json() on the server can parse req.body.publicKey
    const response = await fetch(`${BASE_URL}conversations/${conversationId}/key-exchange`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
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
export async function storeOwnMessagePlaintext(conversationId: any, messageId: any, plaintext: any, userId: any): Promise<void> {
  const key = `ownMessages_${conversationId}`;
  try {
    let dataToStore = plaintext; // Default to plaintext as fallback
    
    // Try to encrypt plaintext with own key before storing
    try {
      const { encryptForOwnStorage } = await import('./messageEncryption.ts');
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
export async function getOwnMessagePlaintext(conversationId: any, messageId: any, userId: any): Promise<any> {
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
      const { decryptFromOwnStorage } = await import('./messageEncryption.ts');
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
export function getAllOwnMessagesForConversation(conversationId: any): any {
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
export function cleanupOldOwnMessages(conversationId: any, keepCount: number = 100): void {
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
export function clearOwnMessagesForConversation(conversationId: any): void {
  const key = `ownMessages_${conversationId}`;
  try {
    localStorage.removeItem(key);
    console.log(`🗑️ Cleared all own messages for conversation ${conversationId}`);
  } catch (error) {
    console.error('Failed to clear own messages:', error);
  }
}
