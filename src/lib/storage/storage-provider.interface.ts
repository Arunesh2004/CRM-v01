export interface StorageProvider {
  uploadFile(tenantId: string, key: string, fileBuffer: Buffer, mimeType: string, metadata?: Record<string, string>): Promise<string>;
  deleteFile(tenantId: string, key: string): Promise<boolean>;
  generateSignedUploadUrl(tenantId: string, key: string, mimeType: string, maxSizeMB: number): Promise<string>;
  generateSignedDownloadUrl(tenantId: string, key: string, expiresInSeconds?: number): Promise<string>;
  getMetadata(tenantId: string, key: string): Promise<Record<string, string> | null>;
}
