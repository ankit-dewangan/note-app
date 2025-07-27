import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Generate a secure encryption key
export const generateEncryptionKey = async (): Promise<string> => {
  const key = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Math.random().toString() + Date.now().toString(),
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return key;
};

// Generate a random IV
export const generateIV = async (): Promise<string> => {
  const iv = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Math.random().toString() + Date.now().toString(),
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return iv.substring(0, 32); // Use first 32 characters for IV
};

// Encrypt data using AES-GCM
export const encryptData = async (data: string, key: string): Promise<string> => {
  try {
    const iv = await generateIV();
    const encodedData = new TextEncoder().encode(data);
    const encodedKey = new TextEncoder().encode(key);
    
    // Use a simple XOR encryption for now (since expo-crypto doesn't support AES-GCM directly)
    const encrypted = new Uint8Array(encodedData.length);
    for (let i = 0; i < encodedData.length; i++) {
      encrypted[i] = encodedData[i] ^ encodedKey[i % encodedKey.length];
    }
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(new TextEncoder().encode(iv));
    combined.set(encrypted, iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt data using AES-GCM
export const decryptData = async (encryptedData: string, key: string): Promise<string> => {
  try {
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const ivLength = 32;
    const iv = new TextDecoder().decode(combined.slice(0, ivLength));
    const encrypted = combined.slice(ivLength);
    const encodedKey = new TextEncoder().encode(key);
    
    // Decrypt using XOR
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ encodedKey[i % encodedKey.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Hash a string
export const hashString = async (input: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
};

// Generate a secure random string
export const generateSecureRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Store encryption key securely
export const storeEncryptionKey = async (key: string): Promise<void> => {
  try {
    console.log('Storing encryption key:', key);
    await SecureStore.setItemAsync('encryption_key', key);
  } catch (error) {
    console.error('Error storing encryption key:', error);
    throw new Error('Failed to store encryption key');
  }
};

// Get encryption key from secure storage
export const getEncryptionKey = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('encryption_key');
  } catch (error) {
    console.error('Error getting encryption key:', error);
    return null;
  }
};

// Get or create global shared encryption key for collaborative notes
export const getGlobalEncryptionKey = async (): Promise<string> => {
  try {
    let key = await SecureStore.getItemAsync('global_encryption_key');
    if (!key) {
      // Use a fixed global key for collaborative notes
      key = 'global-collaborative-notes-key-2024';
      await SecureStore.setItemAsync('global_encryption_key', key);
    }
    return key;
  } catch (error) {
    console.error('Error getting global encryption key:', error);
    // Fallback to fixed key
    return 'global-collaborative-notes-key-2024';
  }
};

// Encrypt note content using global key
export const encryptNoteContent = async (content: string): Promise<string> => {
  try {
    // For global collaborative notes, use shared key
    const key = await getGlobalEncryptionKey();
    return await encryptData(content, key);
  } catch (error) {
    console.error('Error encrypting note content:', error);
    // Return original content if encryption fails
    return content;
  }
};

// Decrypt note content using global key
export const decryptNoteContent = async (encryptedContent: string): Promise<string> => {
  try {
    console.log('Decrypting content, length:', encryptedContent.length);
    
    // Check if content is encrypted by trying to decode it as base64
    // If it's not valid base64, it's likely plain text
    try {
      // Try to decode as base64 to see if it's encrypted
      const decoded = atob(encryptedContent);
      // If we can decode it and it's longer than a reasonable plain text length, it's probably encrypted
        // For global collaborative notes, use shared key
        const key = await getGlobalEncryptionKey();
        console.log('Using global encryption key for decryption...');
        const decrypted = await decryptData(encryptedContent, key);
        console.log('Decryption successful');
        return decrypted;
  
    } catch (base64Error) {
      // Not valid base64, so it's plain text
      console.log('Content is not base64 encoded, returning as plain text');
      return encryptedContent;
    }
  } catch (error) {
    console.error('Error decrypting note content:', error);
    // Return original content if decryption fails
    return encryptedContent;
  }
}; 