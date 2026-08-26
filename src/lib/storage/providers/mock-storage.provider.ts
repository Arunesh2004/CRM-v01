import { StorageProvider } from '../storage-provider.interface';

export class MockStorageProvider implements StorageProvider {
  async uploadFile(tenantId: string, key: string, fileBuffer: Buffer, mimeType: string, metadata?: Record<string, string>): Promise<string> {
    const fullPath = `${tenantId}/${key}`;
    return `mock-r2://${fullPath}`;
  }

  async deleteFile(tenantId: string, key: string): Promise<boolean> {
    return true;
  }

  async generateSignedUploadUrl(tenantId: string, key: string, mimeType: string, maxSizeMB: number): Promise<string> {
    return `https://mock.storage.local/upload/${tenantId}/${key}`;
  }

  async generateSignedDownloadUrl(tenantId: string, key: string, expiresInSeconds?: number): Promise<string> {
    return `https://mock.storage.local/download/${tenantId}/${key}`;
  }

  async getMetadata(tenantId: string, key: string): Promise<Record<string, string> | null> {
    return {
      "x-amz-meta-transcript-status": "COMPLETED"
    };
  }
}
