import CryptoJS from "crypto-js";

// Cache to store derived keys by conversationId
const keyCache = {};

// In-memory storage for split positions (assuming it's defined here or globally)
const inMemoryStorage = {
  splitPositions: {}
};

const CORRUPTION_KEY_LENGTH = 4;

// Generate random 4-character corruption key
function generateCorruptionKey() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  let result = '';
  for (let i = 0; i < 4; i++) {
    // Generate random alphanumeric character
    const char = String.fromCharCode(
      randomBytes[i] % 26 + (randomBytes[i] % 2 === 0 ? 65 : 97)
    );
    result += char;
  }
  return result;
}

// Get split positions from storage or use defaults
function getSplitPositions(conversationId) {
  const stored = inMemoryStorage.splitPositions[conversationId];
  if (stored) {
    return stored;
  }
  return [5, 9, 15, 20, 30];
}

// Add corruption to encrypted message
function addCorruption(encryptedMsg, conversationId) {
  const positions = getSplitPositions(conversationId);
  
  // Only use positions that are within the message length
  const validPositions = positions.filter(pos => pos < encryptedMsg.length);
  
  if (validPositions.length === 0) {
    return encryptedMsg;
  }
  
  let corruptedMessage = "";
  let lastIndex = 0;

  // Add segments with corruption keys
  validPositions.forEach((pos) => {
    // Add the segment up to this position
    corruptedMessage += encryptedMsg.substring(lastIndex, pos);
    
    // Add random 4-character corruption key
    const corruptionKey = generateCorruptionKey();
    corruptedMessage += corruptionKey;
    
    lastIndex = pos;
  });
  
  // Add the remaining part
  corruptedMessage += encryptedMsg.substring(lastIndex);

  return corruptedMessage;
}

// Remove corruption from message - Just remove 4 chars at each position!
function removeCorruption(corruptedMsg, conversationId) {
  const positions = getSplitPositions(conversationId);
  
  let cleanMessage = "";
  let currentIndex = 0;

  // Process each position
  for (let i = 0; i < positions.length; i++) {
    // Calculate segment length for this position
    const segmentLength = positions[i] - (i > 0 ? positions[i - 1] : 0);
    
    // Check if we have enough data to read this segment
    if (currentIndex + segmentLength > corruptedMsg.length) {
      // Not enough data, just take what's left
      cleanMessage += corruptedMsg.substring(currentIndex);
      break;
    }
    
    // Extract the clean segment (without corruption)
    cleanMessage += corruptedMsg.substring(currentIndex, currentIndex + segmentLength);
    currentIndex += segmentLength;
    
    // Skip the 4-character corruption key if it exists
    if (currentIndex + CORRUPTION_KEY_LENGTH <= corruptedMsg.length) {
      // Just skip 4 characters - don't care what they are!
      currentIndex += CORRUPTION_KEY_LENGTH;
    } else {
      // Not enough characters left for corruption key, we're done
      break;
    }
  }
  
  // Add any remaining data (the final segment after last position)
  if (currentIndex < corruptedMsg.length) {
    cleanMessage += corruptedMsg.substring(currentIndex);
  }

  return cleanMessage;
}

// Helper function to get or create the encryption key
function getEncryptionKey(conversationId) {
  const storedKeys = Object.keys(localStorage).filter((key) =>
    key.startsWith(`${conversationId}_`)
  );
  const defaultKey = `${conversationId}_${conversationId}`;
  const customKey = storedKeys.find((key) => key !== defaultKey);

  if (customKey) {
    return localStorage.getItem(customKey);
  }

  if (storedKeys.includes(defaultKey)) {
    return localStorage.getItem(defaultKey);
  }

  // Create and store default key if no keys exist
  localStorage.setItem(defaultKey, conversationId);
  return conversationId;
}

export function encryptMessage(msg, conversationId) {
  if (!conversationId) {
    // No conversation yet → just return plain text
    return msg;
  }

  const K1 = getEncryptionKey(conversationId);
  // Check cache for derived key, or generate and cache it
  let derivedKey = keyCache[conversationId];
  if (!derivedKey) {
    // Use conversationId as a fixed salt for consistency
    derivedKey = CryptoJS.PBKDF2(K1, conversationId, { keySize: 256/32, iterations: 1000 }).toString();
    keyCache[conversationId] = derivedKey;
  }
  const encrypted = CryptoJS.AES.encrypt(msg, derivedKey).toString();
  return addCorruption(encrypted, conversationId);
}

export function decryptMessage(cipher, conversationId) {
  if (!conversationId) {
    // No key → treat it as plain text
    return cipher;
  }

  const K1 = getEncryptionKey(conversationId);
  // Check cache for derived key, or generate and cache it
  let derivedKey = keyCache[conversationId];
  if (!derivedKey) {
    // Use conversationId as a fixed salt for consistency
    derivedKey = CryptoJS.PBKDF2(K1, conversationId, { keySize: 256/32, iterations: 1000 }).toString();
    keyCache[conversationId] = derivedKey;
  }

  // First, try assuming it's corrupted
  const clean = removeCorruption(cipher, conversationId);
  try {
    const bytes = CryptoJS.AES.decrypt(clean, derivedKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted) {
      return decrypted;
    }
  } catch (err) {
    // Ignore and try next
  }

  // If failed, try assuming no corruption
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, derivedKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted) {
      return decrypted;
    }
  } catch (err) {
    // Ignore
  }

  // If both failed, return original
  return cipher;
}