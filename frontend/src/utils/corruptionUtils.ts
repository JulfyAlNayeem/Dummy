// @ts-nocheck
// --- Shared Corruption Layer Utilities ---
// Used by both V1 (CryptoJS) and ECDH encryption

// Default settings
const DEFAULT_POSITIONS = [5, 9, 15, 20, 30];
const DEFAULT_KEY_LENGTH = 4;

// Get corruption settings from localStorage
export function getCorruptionSettings(conversationId: any): any {
  const stored = localStorage.getItem(`corruption_settings_${conversationId}`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        positions: parsed.positions || DEFAULT_POSITIONS,
        keyLength: parsed.keyLength || DEFAULT_KEY_LENGTH
      };
    } catch (e) {
      console.error('Failed to parse corruption settings:', e);
    }
  }
  return {
    positions: DEFAULT_POSITIONS,
    keyLength: DEFAULT_KEY_LENGTH
  };
}

// Save corruption settings to localStorage
export function saveCorruptionSettings(conversationId: any, positions: any, keyLength: any): void {
  const settings = {
    positions: positions.filter(p => p > 0).sort((a, b) => a - b),
    keyLength: Math.max(1, Math.min(keyLength, 20)) // Limit between 1-20
  };
  localStorage.setItem(`corruption_settings_${conversationId}`, JSON.stringify(settings));
  return settings;
}

// Generate random corruption key of specified length
export function generateCorruptionKey(length: number = DEFAULT_KEY_LENGTH): any {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    // Generate random alphanumeric character
    const char = String.fromCharCode(
      randomBytes[i] % 26 + (randomBytes[i] % 2 === 0 ? 65 : 97)
    );
    result += char;
  }
  return result;
}

// Add corruption to encrypted message
export function addCorruption(encryptedMsg: any, conversationId: any): any {
  const { positions, keyLength } = getCorruptionSettings(conversationId);
  
  // Only use positions that are within the message length
  const validPositions = positions.filter(pos => pos < encryptedMsg.length);
  
  if (validPositions.length === 0) {
    return encryptedMsg;
  }
  
  let corruptedMessage = "";
  let lastIndex = 0;

  // Add segments with corruption keys
  validPositions.forEach((pos) => {
    corruptedMessage += encryptedMsg.substring(lastIndex, pos);
    const corruptionKey = generateCorruptionKey(keyLength);
    corruptedMessage += corruptionKey;
    lastIndex = pos;
  });
  
  corruptedMessage += encryptedMsg.substring(lastIndex);
  return corruptedMessage;
}

// Remove corruption from message
export function removeCorruption(corruptedMsg: any, conversationId: any): any {
  const { positions, keyLength } = getCorruptionSettings(conversationId);
  
  let cleanMessage = "";
  let currentIndex = 0;

  for (let i = 0; i < positions.length; i++) {
    const segmentLength = positions[i] - (i > 0 ? positions[i - 1] : 0);
    
    if (currentIndex + segmentLength > corruptedMsg.length) {
      cleanMessage += corruptedMsg.substring(currentIndex);
      break;
    }
    
    cleanMessage += corruptedMsg.substring(currentIndex, currentIndex + segmentLength);
    currentIndex += segmentLength;
    
    if (currentIndex + keyLength <= corruptedMsg.length) {
      currentIndex += keyLength;
    } else {
      break;
    }
  }
  
  if (currentIndex < corruptedMsg.length) {
    cleanMessage += corruptedMsg.substring(currentIndex);
  }

  return cleanMessage;
}
