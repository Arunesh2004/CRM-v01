export interface DataKeyResult {
  plaintextDEK: Buffer;
  encryptedDEK: string; // Base64 or Hex encoded
  kmsKeyId: string;
  kmsKeyVersion: string;
}

export interface KMSProvider {
  /**
   * Generates a new Data Encryption Key (DEK).
   * Returns the plaintext key for immediate use, and the ciphertext for storage.
   */
  generateDataKey(): Promise<DataKeyResult>;

  /**
   * Encrypts a plaintext key/payload using the Cloud KMS Master Key.
   */
  encryptKey(plaintext: Buffer): Promise<{ encryptedDEK: string, kmsKeyId: string, kmsKeyVersion: string }>;

  /**
   * Decrypts the stored DEK ciphertext back into a plaintext DEK for restore operations.
   */
  decryptKey(encryptedDEK: string, kmsKeyId: string, kmsKeyVersion?: string): Promise<Buffer>;

  /**
   * Rotates the active Customer Master Key (CMK) alias to point to a new backing key.
   */
  rotateKey(): Promise<string>;

  /**
   * Validates if a Master Key version is still active and permitted for decryption.
   */
  validateKeyVersion(kmsKeyId: string, version?: string): Promise<boolean>;
}
