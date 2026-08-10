export interface StorageProvider {
  /**
   * Uploads a file buffer to storage and returns a storage key.
   */
  upload(buffer: Buffer, fileName: string, mimeType: string, prefix?: string): Promise<string>;

  /**
   * Generates a signed URL for reading a file.
   */
  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Deletes a file from storage.
   */
  delete(storageKey: string): Promise<boolean>;
}
