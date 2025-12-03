// --- ECDH + AES-GCM Encryption Helper ---
import {
  getPrivateKey,
  getParticipantPublicKey
} from "./messageEncryptionHelperFuction";

// --- ECDH (P-256) Key Generation ---
export async function generateKeyPair() {
  // Generate ECDH key pair (P-256)
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  // Export public key as raw, then Base64
  const publicKeyRaw = await window.crypto.subtle.exportKey(
    "raw",
    keyPair.publicKey
  );
  const publicKeyBase64 = btoa(
    String.fromCharCode(...new Uint8Array(publicKeyRaw))
  );

  // Export private key as JWK JSON string
  const privateKeyJwk = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey
  );
  const privateKeyJson = JSON.stringify(privateKeyJwk);
  console.log("Generated Key Pair:", { publicKeyBase64, privateKeyJson });
  return {
    publicKey: publicKeyBase64, // For backend and localStorage
    privateKey: privateKeyJson, // For localStorage
    publicKeyForBackend: publicKeyBase64,
  };
}

// --- ECDH + AES-GCM Encryption Helper ---
export async function encryptMessage(conversationId, text, currentUserId, otherUserId) {
  console.log('🔐 Encryption Debug:', {
    conversationId,
    currentUserId,
    otherUserId
  });

  // Import storage functions
  const { getConversationKeys, getOrFetchParticipantKey } = await import('./messageEncryptionHelperFuction.js');
  
  // Get our keys from new structured storage
  const ourKeys = getConversationKeys(conversationId, currentUserId);
  
  if (!ourKeys || !ourKeys.privateKey) {
    throw new Error("Missing our private key in localStorage for encryption");
  }

  // CRITICAL: Always fetch recipient's LATEST public key from server to avoid stale cache
  const theirPublicKeyBase64 = await getOrFetchParticipantKey(
    conversationId, 
    otherUserId, 
    currentUserId, 
    true // Force refresh to get latest key
  );
  
  console.log('🔑 Encryption Keys Retrieved:', {
    hasOurPrivateKey: !!ourKeys.privateKey,
    hasTheirPublicKey: !!theirPublicKeyBase64,
    theirPublicKeyBase64: theirPublicKeyBase64?.substring(0, 20) + '...',
    theirPublicKeyLength: theirPublicKeyBase64?.length
  });
  
  if (!theirPublicKeyBase64) {
    throw new Error("Missing recipient's public key for encryption");
  }

  // Import our private key
  const privateKeyJwk = JSON.parse(ourKeys.privateKey);
  const ourPrivateKey = await window.crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"]
  );

  // Import their public key
  const theirPublicKeyRaw = Uint8Array.from(atob(theirPublicKeyBase64), (c) =>
    c.charCodeAt(0)
  );
  const theirPublicKey = await window.crypto.subtle.importKey(
    "raw",
    theirPublicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Generate random salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  // Derive shared secret
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    ourPrivateKey,
    256
  );

  // HKDF to derive AES-GCM key
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    "HKDF",
    false,
    ["deriveKey"]
  );
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: new Uint8Array([]),
    },
    aesKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt message
  const encoder = new TextEncoder();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    derivedKey,
    encoder.encode(text)
  );

  // Return ciphertext, iv, salt as Base64, plus original plaintext for own message storage
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
    plaintext: text, // Include plaintext so sender can store it for their own reference
  };
}

// --- ECDH + AES-GCM Decryption Helper (ID-based wrapper with fallback) ---
export async function decryptMessage(conversationId, payload, senderUserId, currentUserId) {
  console.log('🔓 Decryption Debug:', {
    conversationId,
    senderUserId,
    currentUserId,
    payload
  });

  // Import storage functions
  const { getConversationKeys, getParticipantAllKeys } = await import('./messageEncryptionHelperFuction.js');
  
  // Get our keys from new structured storage
  const ourKeys = getConversationKeys(conversationId, currentUserId);
  
  if (!ourKeys || !ourKeys.privateKey) {
    const error = `Missing our private key in localStorage for decryption`;
    console.error('❌', error);
    throw new Error(error);
  }

  // Get all stored keys for sender (for fallback)
  const allSenderKeys = getParticipantAllKeys(conversationId, currentUserId, senderUserId);
  
  console.log('🔑 Decryption Keys Available:', {
    hasOurPrivateKey: !!ourKeys.privateKey,
    senderKeysCount: allSenderKeys.length,
    senderKeys: allSenderKeys.map(k => ({ 
      keyVersion: k.keyVersion, 
      isActive: k.isActive,
      keyId: k.keyId
    }))
  });

  if (allSenderKeys.length === 0) {
    const error = `No keys found for sender ${senderUserId}`;
    console.error('❌', error);
    throw new Error(error);
  }

  // Try decryption with each key, starting with active/newest
  let lastError = null;
  
  for (const keyData of allSenderKeys) {
    try {
      console.log(`🔄 Trying decryption with key version ${keyData.keyVersion}...`);
      const decrypted = await decryptMessageWithKeys(
        ourKeys.privateKey, 
        keyData.publicKey, 
        payload
      );
      console.log(`✅ Successfully decrypted with key version ${keyData.keyVersion}`);
      return decrypted;
    } catch (error) {
      console.warn(`⚠️ Decryption failed with key version ${keyData.keyVersion}:`, error.message);
      lastError = error;
      // Continue to next key
    }
  }

  // If we get here, all keys failed
  console.error('❌ All decryption attempts failed');
  throw lastError || new Error('Failed to decrypt message with any available keys');
}

// --- ECDH + AES-GCM Decryption Helper (raw keys) ---
export async function decryptMessageWithKeys(
  ourPrivateKeyJson,
  theirPublicKeyBase64,
  payload
) {
  // Import our private key
  const privateKeyJwk = JSON.parse(ourPrivateKeyJson);
  const ourPrivateKey = await window.crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"]
  );

  // Import their public key
  const theirPublicKeyRaw = Uint8Array.from(atob(theirPublicKeyBase64), (c) =>
    c.charCodeAt(0)
  );
  const theirPublicKey = await window.crypto.subtle.importKey(
    "raw",
    theirPublicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Decode salt and iv
  const salt = Uint8Array.from(atob(payload.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));

  // Derive shared secret
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    ourPrivateKey,
    256
  );

  // HKDF to derive AES-GCM key
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    "HKDF",
    false,
    ["deriveKey"]
  );
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: new Uint8Array([]),
    },
    aesKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  // Decode ciphertext
  const ciphertext = Uint8Array.from(atob(payload.ciphertext), (c) =>
    c.charCodeAt(0)
  );

  // Decrypt
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      derivedKey,
      ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (decryptError) {
    console.error('❌ AES-GCM Decryption failed:', decryptError);
    console.error('This usually means the keys used for encryption dont match the keys used for decryption.');
    console.error('Possible causes:');
    console.error('1. The sender encrypted with an OLD version of your public key');
    console.error('2. Your keys were regenerated after the message was encrypted');
    console.error('3. The wrong participant public key is being used');
    throw new Error(`Decryption failed: ${decryptError.message}. Keys may be mismatched - try clearing localStorage and regenerating keys.`);
  }
}

// --- Encrypt plaintext for own storage (using own key pair) ---
export async function encryptForOwnStorage(conversationId, text, userId) {
  try {
    // Get our own keys
    const ourPrivateKeyJson = getPrivateKey(conversationId, userId);
    const { getUserPublicKey } = await import('./messageEncryptionHelperFuction.js');
    const ourPublicKeyBase64 = getUserPublicKey(conversationId, userId);
    
    if (!ourPrivateKeyJson || !ourPublicKeyBase64) {
      console.warn('⚠️ Missing own keys for storage encryption, storing as plaintext');
      return text; // Fallback to plaintext if keys missing
    }
    
    // Encrypt using our own key pair (we can decrypt with our private key)
    const encrypted = await encryptMessageWithKeys(ourPrivateKeyJson, ourPublicKeyBase64, text);
    return JSON.stringify(encrypted); // Return as JSON string
  } catch (error) {
    console.error('Failed to encrypt for own storage:', error);
    return text; // Fallback to plaintext on error
  }
}

// --- Decrypt from own storage (using own key pair) ---
export async function decryptFromOwnStorage(conversationId, encryptedData, userId) {
  try {
    // Try to parse as JSON (encrypted)
    const payload = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
    
    // If not a valid encrypted payload, return as-is (might be plaintext fallback)
    if (!payload.ciphertext || !payload.iv || !payload.salt) {
      return encryptedData; // Return plaintext
    }
    
    // Get our own keys
    const ourPrivateKeyJson = getPrivateKey(conversationId, userId);
    const { getUserPublicKey } = await import('./messageEncryptionHelperFuction.js');
    const ourPublicKeyBase64 = getUserPublicKey(conversationId, userId);
    
    if (!ourPrivateKeyJson || !ourPublicKeyBase64) {
      console.warn('⚠️ Missing own keys for storage decryption');
      return '[Encrypted - keys missing]';
    }
    
    // Decrypt using our own key pair
    const decrypted = await decryptMessageWithKeys(ourPrivateKeyJson, ourPublicKeyBase64, payload);
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt from own storage:', error);
    // If it's not JSON or decryption fails, it might be plaintext
    return typeof encryptedData === 'string' ? encryptedData : '[Decryption failed]';
  }
}

// --- Helper to encrypt message with raw keys (reusable) ---
async function encryptMessageWithKeys(privateKeyJson, publicKeyBase64, text) {
  // Import our private key
  const privateKeyJwk = JSON.parse(privateKeyJson);
  const ourPrivateKey = await window.crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"]
  );

  // Import public key
  const publicKeyRaw = Uint8Array.from(atob(publicKeyBase64), (c) =>
    c.charCodeAt(0)
  );
  const publicKey = await window.crypto.subtle.importKey(
    "raw",
    publicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Generate random salt and IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive shared secret
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    ourPrivateKey,
    256
  );

  // HKDF to derive AES-GCM key
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    "HKDF",
    false,
    ["deriveKey"]
  );
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: new Uint8Array([]),
    },
    aesKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Encrypt message
  const encoder = new TextEncoder();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    derivedKey,
    encoder.encode(text)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

// ...existing storage helpers (unchanged)
