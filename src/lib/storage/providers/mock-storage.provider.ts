import { StorageProvider } from '../storage-provider.interface';

export class MockStorageProvider implements StorageProvider {
   
   
   
   
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async uploadFile(tenantId: string, key: string, fileBuffer: Buffer, mimeType: string, metadata?: Record<string, string>): Promise<string> {
    const fullPath = `${tenantId}/${key}`;
     
     
    return `mock-r2://${fullPath}`;
  }

   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async deleteFile(tenantId: string, key: string): Promise<boolean> {
    return true;
  }
 

   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async generateSignedUploadUrl(tenantId: string, key: string, mimeType: string, maxSizeMB: number): Promise<string> {
     
     
    return `https://mock.storage.local/upload/${tenantId}/${key}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async generateSignedDownloadUrl(tenantId: string, key: string, expiresInSeconds?: number): Promise<string> {
    return `https://mock.storage.local/download/${tenantId}/${key}`;
  }

   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async getMetadata(tenantId: string, key: string): Promise<Record<string, string> | null> {
    return {
      "x-amz-meta-transcript-status": "COMPLETED"
    };
  }
}
