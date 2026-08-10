import { KMSProvider, DataKeyResult } from './KMSProvider';
import { LocalKMSProvider } from './LocalKMSProvider';
import { CloudKMSProvider } from './CloudKMSProvider';

// Architecture configuration: Select KMS provider based on environment
const getKMSProvider = (): KMSProvider => {
  if (process.env.NODE_ENV === 'production') {
    return new CloudKMSProvider();
  }
  return new LocalKMSProvider();
};

export class KeyManagementService {
  private static provider: KMSProvider = getKMSProvider();

  static resetTestProvider() {
    if (this.provider instanceof LocalKMSProvider) {
      this.provider.reset();
    }
  }

  static async generateDataKey(): Promise<DataKeyResult> {
    return await this.provider.generateDataKey();
  }

  static async encryptKey(plaintext: Buffer): Promise<{ encryptedDEK: string; kmsKeyId: string; kmsKeyVersion: string; }> {
    return await this.provider.encryptKey(plaintext);
  }

  static async decryptKey(encryptedDEK: string, kmsKeyId: string, kmsKeyVersion?: string): Promise<Buffer> {
    return await this.provider.decryptKey(encryptedDEK, kmsKeyId, kmsKeyVersion);
  }

  static async rotateKey(): Promise<string> {
    return await this.provider.rotateKey();
  }

  static async validateKeyAvailability(kmsKeyId: string, version?: string): Promise<boolean> {
    return await this.provider.validateKeyVersion(kmsKeyId, version);
  }
}
