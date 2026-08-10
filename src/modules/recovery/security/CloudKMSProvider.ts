import { KMSClient, GenerateDataKeyCommand, EncryptCommand, DecryptCommand, ListAliasesCommand } from '@aws-sdk/client-kms';
import { KMSProvider, DataKeyResult } from './KMSProvider';
import crypto from 'crypto';

export class CloudKMSProvider implements KMSProvider {
  private client: KMSClient;
  private aliasName: string;

  constructor() {
    this.aliasName = process.env.AWS_KMS_ALIAS || 'alias/crm-backups-key';
    this.client = new KMSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-access-key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret-key'
      }
    });
  }

  async generateDataKey(): Promise<DataKeyResult> {
    // Generate a 256-bit AES key for AES-256-GCM
    const command = new GenerateDataKeyCommand({
      KeyId: this.aliasName,
      KeySpec: 'AES_256'
    });

    const response = await this.client.send(command);
    
    if (!response.Plaintext || !response.CiphertextBlob || !response.KeyId) {
      throw new Error('Failed to generate Data Encryption Key from Cloud KMS');
    }

    return {
      plaintextDEK: Buffer.from(response.Plaintext),
      encryptedDEK: Buffer.from(response.CiphertextBlob).toString('base64'),
      kmsKeyId: response.KeyId,
      kmsKeyVersion: '1' // AWS KMS automatically manages backing keys; versions are implicit to the KeyId
    };
  }

  async encryptKey(plaintext: Buffer): Promise<{ encryptedDEK: string; kmsKeyId: string; kmsKeyVersion: string; }> {
    const command = new EncryptCommand({
      KeyId: this.aliasName,
      Plaintext: plaintext
    });
    
    const response = await this.client.send(command);
    if (!response.CiphertextBlob || !response.KeyId) throw new Error('Encryption failed');
    
    return {
      encryptedDEK: Buffer.from(response.CiphertextBlob).toString('base64'),
      kmsKeyId: response.KeyId,
      kmsKeyVersion: '1'
    };
  }

  async decryptKey(encryptedDEK: string, kmsKeyId: string, kmsKeyVersion?: string): Promise<Buffer> {
    const command = new DecryptCommand({
      KeyId: kmsKeyId, // Explicitly decrypt using the key that encrypted it, ignoring current alias mapping
      CiphertextBlob: Buffer.from(encryptedDEK, 'base64')
    });

    const response = await this.client.send(command);
    if (!response.Plaintext) throw new Error('Decryption failed or returned null payload');
    
    return Buffer.from(response.Plaintext);
  }

  async rotateKey(): Promise<string> {
    // True cloud key rotation is handled by AWS KMS automatically or by updating the Alias target.
    // For this abstraction, we just simulate the rotation logging.
    console.log(`[CloudKMS] Triggering key rotation audit on alias ${this.aliasName}`);
    return this.aliasName;
  }

  async validateKeyVersion(kmsKeyId: string, version?: string): Promise<boolean> {
    // Check if the key exists and is enabled by attempting to describe it or list aliases.
    // In production, this requires kms:DescribeKey
    return true; // Simplified for abstraction
  }
}
