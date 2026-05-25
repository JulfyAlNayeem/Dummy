import CryptoJS from "crypto-js";
import { addCorruption, removeCorruption } from "./corruptionUtils";

// Cache to store derived keys by conversationId
const keyCache = {};

// Helper function to get or create the encryption key
function getEncryptionKey(conversationId: any): any {
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

export function encryptMessage(msg: any, conversationId: any): any {
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

export function decryptMessage(cipher: any, conversationId: any): any {
  if (!conversationId) {
    // No key → treat it as plain text
    return cipher;
  }

  const K1 = getEncryptionKey(conversationId);
  console.log('🔑 V1 Decryption - Using key:', K1?.substring(0, 10) + '...');
  
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
      console.log('✅ V1 Decryption SUCCESS with key:', K1?.substring(0, 10) + '...');
      return decrypted;
    }
  } catch (err) {
    // Ignore and try next
    console.log('⚠️ V1 Decryption failed (with corruption removal)');
  }

  // If failed, try assuming no corruption
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, derivedKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted) {
      console.log('✅ V1 Decryption SUCCESS (no corruption) with key:', K1?.substring(0, 10) + '...');
      return decrypted;
    }
  } catch (err) {
    // Ignore
    console.log('⚠️ V1 Decryption failed (without corruption removal)');
  }

  // If both failed, throw error instead of returning cipher
  console.error('❌ V1 Decryption FAILED - Wrong key! Key used:', K1?.substring(0, 10) + '...');
  throw new Error('[V1 Decryption Failed - Wrong Key]');
}