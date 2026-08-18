import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * We expect a 32-byte hex or base64 key in process.env.ENCRYPTION_KEY.
 * For testing, if not set, we will use a fallback (in production it should throw).
 */
function getEncryptionKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (keyStr) {
    const buf = Buffer.from(keyStr, 'base64');
    if (buf.length === 32) return buf;
    if (Buffer.from(keyStr, 'hex').length === 32) return Buffer.from(keyStr, 'hex');
    if (Buffer.from(keyStr, 'utf8').length === 32) return Buffer.from(keyStr, 'utf8');
  }
  
  // Fallback for tests/dev (not for production)
  return crypto.scryptSync('development-encryption-key-secret', 'salt', 32);
}

export class EncryptionService {
  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns a format: version:iv:authTag:ciphertext
   */
  static encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return plaintext as any;
    
    // Check if it's already encrypted
    if (this.isEncrypted(plaintext)) return plaintext;

    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    // v1 is the encryption version
    return `v1:${iv.toString('base64')}:${authTag}:${ciphertext}`;
  }

  /**
   * Decrypts AES-256-GCM ciphertext.
   */
  static decrypt(encryptedText: string | null | undefined): string | null {
    if (!encryptedText) return encryptedText as any;
    if (!this.isEncrypted(encryptedText)) return encryptedText;

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 4 || parts[0] !== 'v1') {
        throw new Error('Invalid encryption format or version');
      }

      const [, iv64, authTag64, cipher64] = parts;
      const iv = Buffer.from(iv64, 'base64');
      const authTag = Buffer.from(authTag64, 'base64');
      const key = getEncryptionKey();

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let plaintext = decipher.update(cipher64, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[DECRYPTION_FAILED]';
    }
  }

  static isEncrypted(text: string): boolean {
    return text.startsWith('v1:');
  }
}
