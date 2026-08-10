import { Readable } from 'stream';

export interface StorageProvider {
  /**
   * Uploads a file stream to the storage provider.
   * @param tenantId The tenant ID to scope the object.
   * @param objectKey The unique key for the object.
   * @param stream The readable stream of data.
   */
  upload(tenantId: string, objectKey: string, stream: Readable): Promise<string>;

  /**
   * Downloads a file stream from the storage provider.
   * @param tenantId The tenant ID scoping the object.
   * @param objectKey The unique key for the object.
   */
  download(tenantId: string, objectKey: string): Promise<Readable>;

  /**
   * Deletes an object from the storage provider.
   * @param tenantId The tenant ID scoping the object.
   * @param objectKey The unique key for the object.
   */
  deleteObject(tenantId: string, objectKey: string): Promise<void>;

  /**
   * Generates a signed URL for secure temporary access.
   * @param tenantId The tenant ID scoping the object.
   * @param objectKey The unique key for the object.
   * @param expiresInSeconds Expiration time in seconds.
   */
  generateSignedUrl(tenantId: string, objectKey: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Verifies if an object exists.
   * @param tenantId The tenant ID scoping the object.
   * @param objectKey The unique key for the object.
   */
  verifyObjectExists(tenantId: string, objectKey: string): Promise<boolean>;

  /**
   * Retrieves metadata for an object.
   * @param tenantId The tenant ID scoping the object.
   * @param objectKey The unique key for the object.
   */
  getObjectMetadata(tenantId: string, objectKey: string): Promise<any>;
}
