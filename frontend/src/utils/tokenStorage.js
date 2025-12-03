import CryptoJS from "crypto-js";

const SECRET_KEY = "1KIhjofdnNKkluifdmdasmflaasdjflamjds/lfkmna/sldkjugf"; // ⚠️ Move to .env in real apps
let decryptedCache = {};


export const setEncryptedToken = (key, value) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
    localStorage.setItem(key, encrypted);

    // Reset cache when token changes
    decryptedCache[key] = null;
  } catch (err) {
    console.error("Error encrypting token", err);
  }
};

export const getDecryptedToken = (key) => {
  try {
    // Return cached value if available
    if (decryptedCache[key]) return decryptedCache[key];

    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // Cache result
    decryptedCache[key] = decrypted;

    return decrypted;
  } catch (err) {
    console.error("Error decrypting token", err);
    return null;
  }
};

export const removeToken = (key) => {
  localStorage.removeItem(key);
  decryptedCache[key] = null;
};
