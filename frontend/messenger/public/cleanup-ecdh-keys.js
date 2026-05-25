// ECDH Encryption - localStorage Cleanup Utility
// Run this in browser console to clean up duplicate/invalid keys

/**
 * Clean up duplicate or invalid ECDH encryption keys from localStorage
 * This fixes the issue where keys were stored with userId=null
 */
function cleanupECDHKeys() {
  console.log('🧹 Starting ECDH keys cleanup...');
  
  const keysToRemove = [];
  const validKeys = [];
  
  // Scan all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    // Check if it's a conversation keys entry
    if (key && key.startsWith('conversationKeys_')) {
      const parts = key.split('_');
      const conversationId = parts[1];
      const userId = parts[2];
      
      // Check for invalid userId (null, undefined, or empty)
      if (!userId || userId === 'null' || userId === 'undefined' || userId.trim() === '') {
        console.log(`❌ Found invalid key: ${key} (userId: ${userId})`);
        keysToRemove.push(key);
      } else {
        console.log(`✅ Valid key: ${key}`);
        validKeys.push({ key, conversationId, userId });
      }
    }
  }
  
  // Summary
  console.log('\n📊 Cleanup Summary:');
  console.log(`  Valid keys: ${validKeys.length}`);
  console.log(`  Invalid keys to remove: ${keysToRemove.length}`);
  
  // Ask for confirmation
  if (keysToRemove.length > 0) {
    const confirmed = confirm(
      `Found ${keysToRemove.length} invalid key(s) to remove.\n\n` +
      `Keys to be removed:\n${keysToRemove.join('\n')}\n\n` +
      `Continue with cleanup?`
    );
    
    if (confirmed) {
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed: ${key}`);
      });
      console.log('✅ Cleanup complete!');
      alert('Cleanup successful! Invalid keys have been removed.');
    } else {
      console.log('❌ Cleanup cancelled by user');
    }
  } else {
    console.log('✅ No invalid keys found. localStorage is clean!');
    alert('No invalid keys found. Your localStorage is already clean!');
  }
  
  // Display remaining valid keys
  if (validKeys.length > 0) {
    console.log('\n📋 Remaining valid keys:');
    validKeys.forEach(({ key, conversationId, userId }) => {
      const data = JSON.parse(localStorage.getItem(key));
      console.log(`\n  Key: ${key}`);
      console.log(`    Conversation: ${conversationId}`);
      console.log(`    User: ${userId}`);
      console.log(`    Has private key: ${!!data.privateKey}`);
      console.log(`    Has public key: ${!!data.publicKey}`);
      console.log(`    Other participants: ${data.otherKeys?.length || 0}`);
    });
  }
}

/**
 * View all ECDH keys in localStorage (without removing)
 */
function viewECDHKeys() {
  console.log('🔍 Viewing all ECDH keys in localStorage...\n');
  
  const allKeys = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    if (key && key.startsWith('conversationKeys_')) {
      const parts = key.split('_');
      const conversationId = parts[1];
      const userId = parts[2];
      
      try {
        const data = JSON.parse(localStorage.getItem(key));
        allKeys.push({
          key,
          conversationId,
          userId,
          hasPrivateKey: !!data.privateKey,
          hasPublicKey: !!data.publicKey,
          otherParticipants: data.otherKeys?.length || 0,
          data
        });
      } catch (e) {
        console.error(`Error parsing key ${key}:`, e);
      }
    }
  }
  
  if (allKeys.length === 0) {
    console.log('No ECDH keys found in localStorage');
    return;
  }
  
  allKeys.forEach(({ key, conversationId, userId, hasPrivateKey, hasPublicKey, otherParticipants, data }) => {
    const isValid = userId && userId !== 'null' && userId !== 'undefined';
    const status = isValid ? '✅' : '❌';
    
    console.log(`${status} ${key}`);
    console.log(`   Conversation: ${conversationId}`);
    console.log(`   User: ${userId} ${isValid ? '' : '(INVALID)'}`);
    console.log(`   Has private key: ${hasPrivateKey}`);
    console.log(`   Has public key: ${hasPublicKey}`);
    console.log(`   Other participants: ${otherParticipants}`);
    
    if (data.otherKeys && data.otherKeys.length > 0) {
      data.otherKeys.forEach(participant => {
        const keyCount = participant.keys?.length || 0;
        console.log(`     → Participant ${participant.userId}: ${keyCount} key version(s)`);
      });
    }
    console.log('');
  });
  
  console.log(`📊 Total keys: ${allKeys.length}`);
  console.log(`   Valid: ${allKeys.filter(k => k.userId && k.userId !== 'null' && k.userId !== 'undefined').length}`);
  console.log(`   Invalid: ${allKeys.filter(k => !k.userId || k.userId === 'null' || k.userId === 'undefined').length}`);
}

/**
 * Remove a specific key by conversationId and userId
 */
function removeSpecificKey(conversationId, userId = null) {
  const key = `conversationKeys_${conversationId}_${userId}`;
  
  if (localStorage.getItem(key)) {
    const confirmed = confirm(`Remove key: ${key}?`);
    if (confirmed) {
      localStorage.removeItem(key);
      console.log(`✅ Removed: ${key}`);
      alert('Key removed successfully!');
    }
  } else {
    console.log(`❌ Key not found: ${key}`);
    alert('Key not found in localStorage!');
  }
}

// Export functions to window for easy access in console
window.cleanupECDHKeys = cleanupECDHKeys;
window.viewECDHKeys = viewECDHKeys;
window.removeSpecificKey = removeSpecificKey;

console.log(`
🛠️ ECDH Encryption Cleanup Utilities Loaded!

Available functions:
  • viewECDHKeys()          - View all ECDH keys (no changes)
  • cleanupECDHKeys()       - Remove invalid keys (with confirmation)
  • removeSpecificKey(conversationId, userId) - Remove specific key

Example usage:
  viewECDHKeys()
  cleanupECDHKeys()
  removeSpecificKey('6963cf8c2a9631b23e0369a2', null)
`);
