// @ts-nocheck
/**
 * SMTE – Server-Managed Transport Encryption (Frontend)
 *
 * Encrypts text & files with an AES-256-GCM key that the server provisions
 * per-conversation. Keys are fetched via Socket.IO and held **in-memory only**
 * (never persisted to localStorage/sessionStorage).
 *
 * Text format on the wire:
 *   SMTE:<version>:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 *
 * File envelope (JSON inside FormData field "smteEncryptedFiles"):
 *   [{ filename, iv, authTag, data }]   // all base64
 *
 * Falls back to the legacy `__BACKEND_ENCRYPT__:` prefix when WebCrypto is
 * unavailable (very old browsers).
 */

// ── in-memory key cache ─────────────────────────────────────────────────────
// Map<conversationId, { keys: [base64, base64?], version: number }>
const keyCache = new Map();

/**
 * Check if WebCrypto AES-GCM is usable (works on HTTP too in most browsers)
 */
export function isSmteAvailable(): boolean {
  try {
    return !!(
      typeof window !== 'undefined' &&
      window.crypto &&
      window.crypto.subtle &&
      typeof window.crypto.subtle.encrypt === 'function'
    );
  } catch {
    return false;
  }
}

// ── key management ──────────────────────────────────────────────────────────

/**
 * Request transport keys from the server via Socket.IO.
 * @param {SocketIO} socket – a connected Socket.IO instance
 * @param {string}   conversationId
 * @returns {Promise<{ keys: string[], version: number }>}
 */
export function requestTransportKeys(socket: any, conversationId: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      return reject(new Error('Socket not connected'));
    }

    const timeout = setTimeout(
      () => reject(new Error('SMTE key request timed out')),
      8000
    );

    socket.emit('smte:request-keys', { conversationId }, (response) => {
      clearTimeout(timeout);
      if (response?.success) {
        // Cache
        keyCache.set(conversationId, {
          keys: response.keys,
          version: response.version,
        });
        resolve({ keys: response.keys, version: response.version });
      } else {
        reject(new Error(response?.error || 'SMTE key request failed'));
      }
    });
  });
}

/**
 * Get cached keys or fetch them from server.
 */
export async function getTransportKeys(socket: any, conversationId: any): Promise<any> {
  const cached = keyCache.get(conversationId);
  if (cached && cached.keys?.length > 0) return cached;
  return requestTransportKeys(socket, conversationId);
}

/**
 * Handle the `smte:key-rotated` event from the server.
 * Call this inside your socket event listeners.
 */
export function handleKeyRotated({ conversationId, keys, version }: any): void {
  keyCache.set(conversationId, { keys, version });
  console.log(`🔄 SMTE: keys rotated for conversation ${conversationId} (v${version})`);
}

/**
 * Clear cached keys (e.g. on logout).
 */
export function clearSmteKeyCache(): void {
  keyCache.clear();
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Decode base64 string → ArrayBuffer */
function b64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Encode ArrayBuffer → base64 string */
function bufferToB64(buffer: any): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Import an AES-256-GCM CryptoKey from a base64 raw key */
async function importKey(b64Key: string): Promise<any> {
  const raw = b64ToBuffer(b64Key);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

// ── encrypt text ────────────────────────────────────────────────────────────

/**
 * Encrypt a text message with the conversation's SMTE transport key.
 *
 * @param {SocketIO} socket
 * @param {string}   conversationId
 * @param {string}   plaintext
 * @returns {Promise<string>} – "SMTE:<v>:<iv>:<tag>:<ct>" or fallback "__BACKEND_ENCRYPT__:…"
 */
export async function encryptText(socket: any, conversationId: any, plaintext: any): Promise<any> {
  if (!isSmteAvailable()) {
    // Graceful fallback – send with legacy marker
    return `__BACKEND_ENCRYPT__:${plaintext}`;
  }

  try {
    const { keys, version } = await getTransportKeys(socket, conversationId);
    const currentKey = keys[0];

    const cryptoKey = await importKey(currentKey);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const encoded = new TextEncoder().encode(plaintext);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      cryptoKey,
      encoded
    );

    // WebCrypto appends the 16-byte auth tag to the end of the ciphertext
    const cipherBytes = new Uint8Array(cipherBuffer);
    const ciphertext = cipherBytes.slice(0, cipherBytes.length - 16);
    const authTag = cipherBytes.slice(cipherBytes.length - 16);

    const ivB64 = bufferToB64(iv);
    const tagB64 = bufferToB64(authTag);
    const ctB64 = bufferToB64(ciphertext);

    return `SMTE:${version}:${ivB64}:${tagB64}:${ctB64}`;
  } catch (err) {
    console.warn('SMTE: text encryption failed, falling back to legacy marker', err);
    return `__BACKEND_ENCRYPT__:${plaintext}`;
  }
}

// ── encrypt file ────────────────────────────────────────────────────────────

/**
 * Encrypt a single File object.
 *
 * Returns an envelope object: { filename, iv, authTag, data } (all base64)
 * that the backend can use to decrypt the on-disk file.
 *
 * The actual File Blob sent via FormData stays as-is (the encrypted bytes);
 * we also return a new Blob so the caller can swap it in.
 *
 * @param {SocketIO} socket
 * @param {string}   conversationId
 * @param {File}     file
 * @returns {Promise<{ envelope: Object, encryptedBlob: Blob } | null>}
 *          null if SMTE is unavailable (skip encryption)
 */
export async function encryptFile(socket: any, conversationId: any, file: any): Promise<any> {
  if (!isSmteAvailable()) return null;

  try {
    const { keys, version } = await getTransportKeys(socket, conversationId);
    const currentKey = keys[0];
    const cryptoKey = await importKey(currentKey);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuf = await file.arrayBuffer();

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      cryptoKey,
      fileBuf
    );

    const cipherBytes = new Uint8Array(cipherBuffer);
    const ciphertext = cipherBytes.slice(0, cipherBytes.length - 16);
    const authTag = cipherBytes.slice(cipherBytes.length - 16);

    const envelope = {
      filename: file.name,
      iv: bufferToB64(iv),
      authTag: bufferToB64(authTag),
      data: bufferToB64(ciphertext),
    };

    // Create a Blob from the full encrypted output (iv + ciphertext + tag)
    // This is what gets uploaded via multer; the envelope carries the split
    // components for server-side decryption.
    const encryptedBlob = new Blob([cipherBuffer], { type: file.type });

    return { envelope, encryptedBlob };
  } catch (err) {
    console.warn('SMTE: file encryption failed for', file.name, err);
    return null; // fallback: file goes unencrypted
  }
}

/**
 * Encrypt an array of File objects and return FormData-ready data.
 *
 * @param {SocketIO} socket
 * @param {string}   conversationId
 * @param {File[]}   files
 * @returns {Promise<{ processedFiles: File[], envelopes: Object[] }>}
 */
export async function encryptFiles(socket: any, conversationId: any, files: any): Promise<any> {
  if (!isSmteAvailable() || !files || files.length === 0) {
    return { processedFiles: files, envelopes: [] };
  }

  const processedFiles = [];
  const envelopes = [];

  for (const file of files) {
    if (!(file instanceof File)) {
      processedFiles.push(file);
      continue;
    }

    const result = await encryptFile(socket, conversationId, file);
    if (result) {
      // Replace with encrypted blob but keep the same File interface
      const encryptedFile = new File([result.encryptedBlob], file.name, {
        type: file.type,
        lastModified: file.lastModified,
      });
      processedFiles.push(encryptedFile);
      envelopes.push(result.envelope);
    } else {
      processedFiles.push(file); // fallback: unencrypted
    }
  }

  return { processedFiles, envelopes };
}
