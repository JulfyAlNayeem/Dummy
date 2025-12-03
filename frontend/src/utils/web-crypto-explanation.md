# 🔐 Web Crypto Encryption Code - Complete Explanation

## 📚 Table of Contents
1. [Storage & Constants](#storage)
2. [Helper Functions](#helpers)
3. [Key Generation](#key-generation)
4. [AES-GCM Encryption/Decryption](#aes-gcm)
5. [Corruption Logic](#corruption)
6. [Main Functions](#main-functions)
7. [Complete Example Flow](#example-flow)
8. [ECDH Bonus Features](#ecdh)

---

## 🗄️ Storage & Constants {#storage}

```javascript
const inMemoryStorage = {
  keys: {},           // Store encryption keys
  splitPositions: {}, // Store custom split positions
  keyPairs: {}        // Store ECDH key pairs
};

const keyCache = {};  // Cache derived keys for performance

const CORRUPTION_KEY_LENGTH = 4; // Fixed length for corruption keys
```

**What it does:**
- `inMemoryStorage`: Stores everything in memory (lost on page reload)
- `keyCache`: Stores derived keys so we don't recalculate them
- `CORRUPTION_KEY_LENGTH`: Always use 4-character corruption keys

---

## 🔧 Helper Functions {#helpers}

### 1. String to ArrayBuffer (str2ab)

```javascript
function str2ab(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}
```

**Example:**
```javascript
str2ab("Hello") 
// Returns: Uint8Array [72, 101, 108, 108, 111]
//          (ASCII codes for H, e, l, l, o)
```

**Why?** Web Crypto API only works with ArrayBuffers, not strings.

---

### 2. ArrayBuffer to String (ab2str)

```javascript
function ab2str(buffer) {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}
```

**Example:**
```javascript
ab2str(Uint8Array [72, 101, 108, 108, 111])
// Returns: "Hello"
```

**Why?** Convert decrypted data back to readable text.

---

### 3. ArrayBuffer to Base64 (ab2base64)

```javascript
function ab2base64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

**Example:**
```javascript
ab2base64(Uint8Array [72, 101, 108, 108, 111])
// Returns: "SGVsbG8="
```

**Why?** Base64 can be stored as text in databases.

---

### 4. Base64 to ArrayBuffer (base642ab)

```javascript
function base642ab(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

**Example:**
```javascript
base642ab("SGVsbG8=")
// Returns: Uint8Array [72, 101, 108, 108, 111]
```

**Why?** Convert Base64 from database back to binary for decryption.

---

## 🔑 Key Generation {#key-generation}

### 1. Generate ECDH Key Pair (getOrCreateKeyPair)

```javascript
async function getOrCreateKeyPair(conversationId) {
  if (inMemoryStorage.keyPairs[conversationId]) {
    return inMemoryStorage.keyPairs[conversationId];
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  inMemoryStorage.keyPairs[conversationId] = keyPair;
  return keyPair;
}
```

**Example:**
```javascript
const keyPair = await getOrCreateKeyPair("conv_123");
// Returns: {
//   publicKey: CryptoKey { ... },
//   privateKey: CryptoKey { ... }
// }
```

**What it does:**
- Checks if key pair already exists for this conversation
- If not, generates a new ECDH key pair (for secure key exchange)
- Stores it in memory
- Returns the key pair

**Real-world analogy:** Like generating a lock (public key) and key (private key) for a mailbox.

---

### 2. Derive AES-GCM Key (deriveKey)

```javascript
async function deriveKey(conversationId) {
  if (keyCache[conversationId]) {
    return keyCache[conversationId];
  }

  const password = str2ab(conversationId);
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    password,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const salt = str2ab(conversationId);
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache[conversationId] = derivedKey;
  return derivedKey;
}
```

**Example:**
```javascript
const key = await deriveKey("conv_123");
// Returns: CryptoKey for AES-GCM encryption
```

**What it does:**

**Step 1:** Check cache
```javascript
if (keyCache["conv_123"]) return cached_key;
```

**Step 2:** Convert conversation ID to bytes
```javascript
"conv_123" → [99, 111, 110, 118, 95, 49, 50, 51]
```

**Step 3:** Import as key material
```javascript
Import those bytes as "raw key material"
```

**Step 4:** Run PBKDF2 (Password-Based Key Derivation)
```javascript
PBKDF2(
  password: "conv_123",
  salt: "conv_123",
  iterations: 100000,  // Run hash 100,000 times (slow = secure!)
  hash: SHA-256
)
// Returns: Strong 256-bit AES key
```

**Step 5:** Cache and return
```javascript
keyCache["conv_123"] = derived_key;
return derived_key;
```

**Real-world analogy:** Like making a super strong key from a password by grinding it 100,000 times through a machine.

---

## 🔒 AES-GCM Encryption/Decryption {#aes-gcm}

### 1. Encrypt with AES-GCM (encryptAES)

```javascript
async function encryptAES(plaintext, key) {
  // Generate random IV (12 bytes)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    str2ab(plaintext)
  );

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return ab2base64(combined.buffer);
}
```

**Example Step-by-Step:**

**Input:**
```javascript
plaintext = "Hello"
key = (256-bit AES key)
```

**Step 1:** Generate random IV (Initialization Vector)
```javascript
iv = [23, 45, 67, 89, 12, 34, 56, 78, 90, 11, 22, 33]
// Random 12 bytes (different every time!)
```

**Step 2:** Encrypt the text
```javascript
encrypted = crypto.subtle.encrypt(
  AES-GCM with iv,
  key,
  "Hello" → [72, 101, 108, 108, 111]
)
// Returns: [147, 229, 183, 94, 203, ...] (encrypted bytes)
```

**Step 3:** Combine IV + encrypted
```javascript
combined = [
  23, 45, 67, 89, 12, 34, 56, 78, 90, 11, 22, 33,  ← IV (first 12 bytes)
  147, 229, 183, 94, 203, ...                       ← Encrypted data
]
```

**Step 4:** Convert to Base64
```javascript
ab2base64(combined)
// Returns: "F01EQ1iFTCyN5re+y..."
```

**Why combine IV + encrypted?**
- We need the same IV to decrypt later
- Storing them together is convenient
- IV is not secret (but must be unique each time)

---

### 2. Decrypt with AES-GCM (decryptAES)

```javascript
async function decryptAES(ciphertext, key) {
  const combined = new Uint8Array(base642ab(ciphertext));
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encrypted
  );

  return ab2str(decrypted);
}
```

**Example Step-by-Step:**

**Input:**
```javascript
ciphertext = "F01EQ1iFTCyN5re+y..."
key = (same 256-bit AES key)
```

**Step 1:** Convert Base64 to bytes
```javascript
combined = [23, 45, 67, 89, ..., 147, 229, 183, 94, ...]
```

**Step 2:** Extract IV (first 12 bytes)
```javascript
iv = [23, 45, 67, 89, 12, 34, 56, 78, 90, 11, 22, 33]
```

**Step 3:** Extract encrypted data (rest)
```javascript
encrypted = [147, 229, 183, 94, 203, ...]
```

**Step 4:** Decrypt
```javascript
decrypted = crypto.subtle.decrypt(
  AES-GCM with iv,
  key,
  encrypted
)
// Returns: [72, 101, 108, 108, 111]
```

**Step 5:** Convert to string
```javascript
ab2str([72, 101, 108, 108, 111])
// Returns: "Hello"
```

---

## 🔨 Corruption Logic {#corruption}

### 1. Generate Random Corruption Key (generateCorruptionKey)

```javascript
function generateCorruptionKey() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  let result = '';
  for (let i = 0; i < 4; i++) {
    const char = String.fromCharCode(
      randomBytes[i] % 26 + (randomBytes[i] % 2 === 0 ? 65 : 97)
    );
    result += char;
  }
  return result;
}
```

**Example:**
```javascript
randomBytes = [142, 73, 200, 15]

For each byte:
  142 % 26 = 12, 142 % 2 = 0 → 65 + 12 = 77 → 'M'
  73 % 26 = 21, 73 % 2 = 1 → 97 + 21 = 118 → 'v'
  200 % 26 = 18, 200 % 2 = 0 → 65 + 18 = 83 → 'S'
  15 % 26 = 15, 15 % 2 = 1 → 97 + 15 = 112 → 'p'

Result: "MvSp"
```

**What it does:**
- Generates 4 random bytes
- Converts each to uppercase (A-Z) or lowercase (a-z)
- Returns a 4-character random string like "XpKd"

---

### 2. Get Split Positions (getSplitPositions)

```javascript
function getSplitPositions(conversationId) {
  const stored = inMemoryStorage.splitPositions[conversationId];
  if (stored) {
    return stored;
  }
  return [5, 9, 15, 20, 30];
}
```

**Example:**
```javascript
getSplitPositions("conv_123")
// Returns: [5, 9, 15, 20, 30] (default)

// Or if custom positions were set:
setSplitPositions("conv_123", [3, 7, 12]);
getSplitPositions("conv_123")
// Returns: [3, 7, 12]
```

---

### 3. Add Corruption (addCorruption)

```javascript
function addCorruption(encryptedMsg, conversationId) {
  const positions = getSplitPositions(conversationId);
  const validPositions = positions.filter(pos => pos < encryptedMsg.length);
  
  if (validPositions.length === 0) {
    return encryptedMsg;
  }
  
  let corruptedMessage = "";
  let lastIndex = 0;

  validPositions.forEach((pos) => {
    corruptedMessage += encryptedMsg.substring(lastIndex, pos);
    const corruptionKey = generateCorruptionKey();
    corruptedMessage += corruptionKey;
    lastIndex = pos;
  });
  
  corruptedMessage += encryptedMsg.substring(lastIndex);
  return corruptedMessage;
}
```

**Example with Dummy Data:**

**Input:**
```javascript
encryptedMsg = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" (26 chars)
conversationId = "conv_123"
positions = [5, 9, 15, 20, 30]
```

**Step 1:** Filter valid positions
```javascript
validPositions = [5, 9, 15, 20] // 30 is beyond length 26, excluded
```

**Step 2:** Split and add corruption

```javascript
Position 5:
  Add chars 0-5: "ABCDE"
  Add random key: "XpKd"
  lastIndex = 5

Position 9:
  Add chars 5-9: "FGHI"
  Add random key: "MvSp"
  lastIndex = 9

Position 15:
  Add chars 9-15: "JKLMNO"
  Add random key: "QwRt"
  lastIndex = 15

Position 20:
  Add chars 15-20: "PQRST"
  Add random key: "ZxCv"
  lastIndex = 20

Remaining:
  Add chars 20-26: "UVWXYZ"
```

**Final corrupted message:**
```javascript
"ABCDE" + "XpKd" + "FGHI" + "MvSp" + "JKLMNO" + "QwRt" + "PQRST" + "ZxCv" + "UVWXYZ"
= "ABCDEXpKdFGHIMvSpJKLMNOQwRtPQRSTZxCvUVWXYZ"

Original length: 26
Corrupted length: 42 (26 + 4×4 = 42)
```

---

### 4. Remove Corruption (removeCorruption)

```javascript
function removeCorruption(corruptedMsg, conversationId) {
  const positions = getSplitPositions(conversationId);
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
    
    if (currentIndex + CORRUPTION_KEY_LENGTH <= corruptedMsg.length) {
      currentIndex += CORRUPTION_KEY_LENGTH; // Skip 4 chars
    } else {
      break;
    }
  }
  
  if (currentIndex < corruptedMsg.length) {
    cleanMessage += corruptedMsg.substring(currentIndex);
  }

  return cleanMessage;
}
```

**Example with Same Dummy Data:**

**Input:**
```javascript
corruptedMsg = "ABCDEXpKdFGHIMvSpJKLMNOQwRtPQRSTZxCvUVWXYZ" (42 chars)
positions = [5, 9, 15, 20, 30]
```

**Step-by-Step Removal:**

```javascript
i = 0, position = 5:
  segmentLength = 5 - 0 = 5
  Read 5 chars from index 0: "ABCDE"
  cleanMessage = "ABCDE"
  currentIndex = 5
  Skip 4 chars: currentIndex = 9

i = 1, position = 9:
  segmentLength = 9 - 5 = 4
  Read 4 chars from index 9: "FGHI"
  cleanMessage = "ABCDEFGHI"
  currentIndex = 13
  Skip 4 chars: currentIndex = 17

i = 2, position = 15:
  segmentLength = 15 - 9 = 6
  Read 6 chars from index 17: "JKLMNO"
  cleanMessage = "ABCDEFGHIJKLMNO"
  currentIndex = 23
  Skip 4 chars: currentIndex = 27

i = 3, position = 20:
  segmentLength = 20 - 15 = 5
  Read 5 chars from index 27: "PQRST"
  cleanMessage = "ABCDEFGHIJKLMNOPQRST"
  currentIndex = 32
  Skip 4 chars: currentIndex = 36

i = 4, position = 30:
  segmentLength = 30 - 20 = 10
  currentIndex (36) + 10 > 42, so just take remaining
  Read from 36 to end: "UVWXYZ"
  cleanMessage = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
```

**Final clean message:**
```javascript
"ABCDEFGHIJKLMNOPQRSTUVWXYZ" (26 chars, back to original!)
```

---

## 🚀 Main Functions {#main-functions}

### 1. Encrypt Message (encryptMessage)

```javascript
export async function encryptMessage(msg, conversationId) {
  if (!conversationId) {
    return msg;
  }

  try {
    const derivedKey = await deriveKey(conversationId);
    const firstEncrypted = await encryptAES(msg, derivedKey);
    const corruptedMessage = addCorruption(firstEncrypted, conversationId);
    const finalEncrypted = await encryptAES(corruptedMessage, derivedKey);
    return finalEncrypted;
  } catch (err) {
    console.error("Encryption error:", err);
    return msg;
  }
}
```

**Example Flow:**
```javascript
Input: "Hello", "conv_123"

Step 1: Derive key from "conv_123"
  → CryptoKey (256-bit AES-GCM key)

Step 2: First encryption
  "Hello" → AES-GCM → "F01EQ1i..." (Base64)

Step 3: Add corruption at [5, 9, 15, 20, 30]
  "F01EQ1i..." → "F01EQXpKd1i..." (added random keys)

Step 4: Second encryption
  "F01EQXpKd1i..." → AES-GCM → "Z9xMpQw..." (Final cipher)

Output: "Z9xMpQw..."
```

---

### 2. Decrypt Message (decryptMessage)

```javascript
export async function decryptMessage(cipher, conversationId) {
  if (!conversationId) {
    return cipher;
  }

  try {
    const derivedKey = await deriveKey(conversationId);
    const corruptedMessage = await decryptAES(cipher, derivedKey);
    
    if (!corruptedMessage) {
      return cipher;
    }

    const cleanMessage = removeCorruption(corruptedMessage, conversationId);
    
    if (!cleanMessage || cleanMessage.length === 0) {
      return cipher;
    }

    const originalMessage = await decryptAES(cleanMessage, derivedKey);
    
    if (!originalMessage) {
      return cipher;
    }

    return originalMessage;
  } catch (err) {
    console.error("Decryption error:", err);
    return cipher;
  }
}
```

**Example Flow:**
```javascript
Input: "Z9xMpQw...", "conv_123"

Step 1: Derive key from "conv_123"
  → CryptoKey (same 256-bit AES-GCM key)

Step 2: First decryption
  "Z9xMpQw..." → AES-GCM → "F01EQXpKd1i..." (corrupted message)

Step 3: Remove corruption at [5, 9, 15, 20, 30]
  "F01EQXpKd1i..." → "F01EQ1i..." (clean encrypted)

Step 4: Second decryption
  "F01EQ1i..." → AES-GCM → "Hello" (original message)

Output: "Hello"
```

---

## 📖 Complete Example Flow {#example-flow}

### Encryption Example:

```javascript
const msg = "Secret Message";
const convId = "conv_456";

// Call encrypt
const encrypted = await encryptMessage(msg, convId);

console.log("Original:", msg);
// "Secret Message"

console.log("Encrypted:", encrypted);
// "Kx9pQmN3dR8sT4vY2..."
```

**Internal Steps:**
1. Derive key: PBKDF2("conv_456") → AES-GCM key
2. Encrypt #1: "Secret Message" → "Abc123Def456..."
3. Corrupt: "Abc123Def456..." → "Abc12XpKd3Def45MvSp6..."
4. Encrypt #2: "Abc12XpKd3Def45MvSp6..." → "Kx9pQmN3dR8sT4vY2..."

### Decryption Example:

```javascript
const cipher = "Kx9pQmN3dR8sT4vY2...";
const convId = "conv_456";

// Call decrypt
const decrypted = await decryptMessage(cipher, convId);

console.log("Encrypted:", cipher);
// "Kx9pQmN3dR8sT4vY2..."

console.log("Decrypted:", decrypted);
// "Secret Message"
```

**Internal Steps:**
1. Derive key: PBKDF2("conv_456") → Same AES-GCM key
2. Decrypt #1: "Kx9pQmN3dR8sT4vY2..." → "Abc12XpKd3Def45MvSp6..."
3. Remove corruption: "Abc12XpKd3Def45MvSp6..." → "Abc123Def456..."
4. Decrypt #2: "Abc123Def456..." → "Secret Message"

---

## 🔐 ECDH Bonus Features {#ecdh}

### Generate Key Pair
```javascript
const keyPair = await generateKeyPair("conv_123");
// Returns: { publicKey, privateKey }
```

### Export Public Key (to share with others)
```javascript
const publicKeyBase64 = await exportPublicKey("conv_123");
// Returns: "MFkwEw..." (Base64 string you can send to other user)
```

### Import Other User's Public Key
```javascript
const otherPublicKey = await importPublicKey("MFkwEw...");
// Returns: CryptoKey (other user's public key)
```

### Derive Shared Secret (for end-to-end encryption)
```javascript
const sharedSecret = await deriveSharedSecret("conv_123", otherPublicKey);
// Returns: "XyZ123..." (shared secret both users can derive)
```

**Use case:** Two users can generate a shared secret without transmitting it!