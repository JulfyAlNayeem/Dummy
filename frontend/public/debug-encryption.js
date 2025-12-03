/**
 * DEBUG HELPER - Add this to your browser console to debug encryption
 */

// 1. Check if keys exist
function checkKeys(conversationId) {
  const keys = Object.keys(localStorage).filter(k => k.includes(conversationId));
  console.log('🔍 Keys in localStorage:', keys);
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, typeof value === 'string' ? value.substring(0, 50) + '...' : value);
  });
  
  return keys;
}

// 2. Clear all keys for a conversation
function clearAllKeys(conversationId) {
  const keys = Object.keys(localStorage).filter(k => k.includes(conversationId));
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ Cleared ${keys.length} keys for conversation ${conversationId}`);
  return keys.length;
}

// 3. Monitor localStorage changes
let originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  console.log('💾 localStorage.setItem:', key, '=', typeof value === 'string' ? value.substring(0, 50) + '...' : value);
  return originalSetItem.apply(this, arguments);
};

// 4. Test the encryption workflow manually
async function testEncryption(conversationId, receiver, message = "Test message") {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 MANUAL ENCRYPTION TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Conversation ID:', conversationId);
  console.log('Receiver:', receiver);
  console.log('Message:', message);
  
  try {
    // Import the workflow
    const { prepareAndEncryptMessage } = await import('./src/utils/messageEncryptionWorkflow.js');
    const { useExchangeConversationKeyMutation } = await import('./src/redux/api/conversationKeyApi.js');
    
    // You'll need to get the current user ID from your auth context
    const currentUserId = 'YOUR_USER_ID'; // Replace this
    
    console.log('⚠️ Note: You need to call this from inside React component with proper hooks');
    console.log('This is just a structure test');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 5. Watch for encryption activity
console.log('🔍 ENCRYPTION DEBUG HELPER LOADED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Available commands:');
console.log('  checkKeys("conversation-id") - Check what keys exist');
console.log('  clearAllKeys("conversation-id") - Clear all keys for testing');
console.log('');
console.log('localStorage monitoring is now active!');
console.log('You will see 💾 logs when keys are saved.');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Make functions global
window.checkKeys = checkKeys;
window.clearAllKeys = clearAllKeys;
window.testEncryption = testEncryption;
