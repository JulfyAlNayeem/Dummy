/**
 * Debug utilities for encryption troubleshooting
 * Run these functions in the browser console to diagnose issues
 */

import { BASE_URL } from './baseUrls';
import { getDecryptedToken } from '@/utils/tokenStorage';

// Check if local keys match server keys
export async function verifyKeysMatchServer(conversationId, currentUserId) {
  console.log('🔍 Verifying local keys match server keys...');
  
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
    
    if (!response.ok) {
      console.error('❌ Failed to fetch keys from server');
      return;
    }
    
    const data = await response.json();
    console.log('📡 Server response:', data);
    
    const serverKeys = data.data.keys || [];
    console.log(`📦 Server has ${serverKeys.length} participant keys`);
    
    // Check each participant's key
    for (const serverKey of serverKeys) {
      const { userId, publicKey, keyVersion } = serverKey;
      const localKey = localStorage.getItem(`otherUser_publicKey_${conversationId}_${userId}`);
      
      if (!localKey) {
        console.warn(`⚠️ Missing local key for user ${userId}`);
        console.log(`  Server has key version ${keyVersion}`);
        continue;
      }
      
      if (localKey === publicKey) {
        console.log(`✅ Key matches for user ${userId} (version ${keyVersion})`);
      } else {
        console.error(`❌ KEY MISMATCH for user ${userId}!`);
        console.log(`  Server key (v${keyVersion}):`, publicKey.substring(0, 40) + '...');
        console.log(`  Local key:`, localKey.substring(0, 40) + '...');
        console.log(`  🔧 FIX: Run updateLocalKey('${conversationId}', '${userId}', serverKey)`);
      }
    }
    
    // Check our own key on server
    console.log('\n🔍 Checking our own key on server...');
    const ourPrivateKey = localStorage.getItem(`privateKey_${conversationId}_${currentUserId}`);
    const ourPublicKey = localStorage.getItem(`publicKey_${conversationId}_${currentUserId}`);
    
    if (!ourPrivateKey || !ourPublicKey) {
      console.error('❌ Missing our own keys in localStorage!');
    } else {
      console.log('✅ We have our own private and public keys locally');
    }
    
  } catch (error) {
    console.error('❌ Error verifying keys:', error);
  }
}

// Force update local key from server
export async function updateLocalKey(conversationId, userId, serverKeyData) {
  const { publicKey } = serverKeyData;
  localStorage.setItem(`otherUser_publicKey_${conversationId}_${userId}`, publicKey);
  console.log(`✅ Updated local key for user ${userId}`);
}

// Clear all keys and force regeneration
export function clearAllKeysForConversation(conversationId) {
  const keys = Object.keys(localStorage);
  const conversationKeys = keys.filter(k => k.includes(conversationId));
  
  console.log(`🗑️ Clearing ${conversationKeys.length} keys for conversation ${conversationId}`);
  conversationKeys.forEach(k => {
    console.log(`  Removing: ${k}`);
    localStorage.removeItem(k);
  });
  
  console.log('✅ All keys cleared. Reload page to regenerate.');
}

// Export for console access
if (typeof window !== 'undefined') {
  window.debugEncryption = {
    verifyKeysMatchServer,
    updateLocalKey,
    clearAllKeysForConversation
  };
  console.log('🔧 Debug tools loaded! Use: window.debugEncryption');
}
