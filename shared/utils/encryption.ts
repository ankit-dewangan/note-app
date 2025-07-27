import { randomBytes, createCipher, createDecipher, createHash, pbkdf2Sync } from 'crypto';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface DecryptionResult {
  decryptedData: string;
  success: boolean;
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a random initialization vector
 */
export function generateIV(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt
 * @param key - Encryption key (32 bytes)
 * @param iv - Initialization vector (16 bytes)
 */
export function encryptData(data: string, key: string, iv?: string): EncryptionResult {
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = iv ? Buffer.from(iv, 'hex') : randomBytes(16);
    
    const cipher = createCipher('aes-256-gcm', keyBuffer);
    cipher.setAAD(Buffer.from('note-app', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: ivBuffer.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Encrypted data
 * @param key - Encryption key (32 bytes)
 * @param iv - Initialization vector (16 bytes)
 * @param authTag - Authentication tag
 */
export function decryptData(
  encryptedData: string,
  key: string,
  iv: string,
  authTag: string
): DecryptionResult {
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    
    const decipher = createDecipher('aes-256-gcm', keyBuffer);
    decipher.setAAD(Buffer.from('note-app', 'utf8'));
    decipher.setAuthTag(authTagBuffer);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return {
      decryptedData: decrypted,
      success: true,
    };
  } catch (error) {
    return {
      decryptedData: '',
      success: false,
    };
  }
}

/**
 * Encrypt note content with metadata
 */
export function encryptNoteContent(content: string, key: string): string {
  const result = encryptData(content, key);
  return JSON.stringify({
    data: result.encryptedData,
    iv: result.iv,
    authTag: result.authTag,
    version: 1,
  });
}

/**
 * Decrypt note content
 */
export function decryptNoteContent(encryptedContent: string, key: string): string {
  try {
    const parsed = JSON.parse(encryptedContent);
    const result = decryptData(parsed.data, key, parsed.iv, parsed.authTag);
    
    if (!result.success) {
      throw new Error('Decryption failed');
    }
    
    return result.decryptedData;
  } catch (error) {
    throw new Error(`Failed to decrypt note content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Hash a string for comparison (not reversible)
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a secure random string
 */
export function generateSecureRandomString(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Derive a key from a password using PBKDF2
 */
export function deriveKeyFromPassword(password: string, salt: string): string {
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return key.toString('hex');
}

/**
 * Generate a salt for password derivation
 */
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
} 