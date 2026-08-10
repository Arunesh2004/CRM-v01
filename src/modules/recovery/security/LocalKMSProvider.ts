import { KMSProvider, DataKeyResult } from './KMSProvider';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * NON-PRODUCTION: Local KMS Provider for testing only.
 * Simulates Envelope Encryption KMS behavior.
 */
export class LocalKMSProvider implements KMSProvider {
  private storageFile: string;

  constructor() {
    this.storageFile = path.join(process.cwd(), '.kms-storage.json');
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.storageFile)) {
      this.reset();
    }
  }

  public reset() {
    const initialKey = crypto.randomBytes(32).toString('hex');
    const data = {
      activeVersion: 'v1',
      keys: {
        'v1': { keyHex: initialKey, status: 'ACTIVE' }
      }
    };
    fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
  }

  private readStorage(): any {
    return JSON.parse(fs.readFileSync(this.storageFile, 'utf-8'));
  }

  private writeStorage(data: any) {
    fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
  }

  private getMasterKey(version: string): Buffer {
    const data = this.readStorage();
    const keyInfo = data.keys[version];
    if (!keyInfo) throw new Error(`Master Key version ${version} not found`);
    if (keyInfo.status !== 'ACTIVE' && keyInfo.status !== 'ROTATED') {
        // We might allow decryption of ROTATED keys, but not DISABLED
        if (keyInfo.status === 'DISABLED') throw new Error(`Key version ${version} has been disabled`);
    }
    return Buffer.from(keyInfo.keyHex, 'hex');
  }

  private getActiveMasterKeyVersion(): string {
     return this.readStorage().activeVersion;
  }

  async generateDataKey(): Promise<DataKeyResult> {
    const plaintextDEK = crypto.randomBytes(32);
    const { encryptedDEK, kmsKeyId, kmsKeyVersion } = await this.encryptKey(plaintextDEK);

    return {
      plaintextDEK,
      encryptedDEK,
      kmsKeyId,
      kmsKeyVersion
    };
  }

  async encryptKey(plaintext: Buffer): Promise<{ encryptedDEK: string; kmsKeyId: string; kmsKeyVersion: string; }> {
    const version = this.getActiveMasterKeyVersion();
    const masterKey = this.getMasterKey(version);
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Store IV + TAG + CIPHERTEXT in the base64 string
    const blob = Buffer.concat([iv, tag, encrypted]).toString('base64');

    return {
      encryptedDEK: blob,
      kmsKeyId: 'local-kms-alias',
      kmsKeyVersion: version
    };
  }

  async decryptKey(encryptedDEK: string, kmsKeyId: string, kmsKeyVersion?: string): Promise<Buffer> {
    if (!kmsKeyVersion) throw new Error('LocalKMS requires explicit kmsKeyVersion to resolve the master key');
    
    const masterKey = this.getMasterKey(kmsKeyVersion);
    const blob = Buffer.from(encryptedDEK, 'base64');
    
    const iv = blob.subarray(0, 16);
    const tag = blob.subarray(16, 32);
    const ciphertext = blob.subarray(32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
  }

  async rotateKey(): Promise<string> {
    const data = this.readStorage();
    const oldVersion = data.activeVersion;
    
    if (data.keys[oldVersion]) {
        data.keys[oldVersion].status = 'ROTATED';
    }

    const newVersion = `v${Object.keys(data.keys).length + 1}`;
    const newKey = crypto.randomBytes(32).toString('hex');
    
    data.keys[newVersion] = { keyHex: newKey, status: 'ACTIVE' };
    data.activeVersion = newVersion;
    this.writeStorage(data);
    return newVersion;
  }

  async disableKey(version: string): Promise<void> {
    const data = this.readStorage();
    if (!data.keys[version]) throw new Error(`Key version ${version} not found`);
    if (data.activeVersion === version) throw new Error('Cannot disable the currently active key');
    
    data.keys[version].status = 'DISABLED';
    this.writeStorage(data);
  }

  async validateKeyVersion(kmsKeyId: string, version?: string): Promise<boolean> {
    if (!version) return false;
    try {
      this.getMasterKey(version);
      return true;
    } catch {
      return false;
    }
  }
}
