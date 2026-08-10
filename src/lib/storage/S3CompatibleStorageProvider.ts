import { Readable } from 'stream';
import { StorageProvider } from './StorageProvider';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3CompatibleStorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.AWS_BUCKET_NAME || 'crm-backups-bucket';
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-access-key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret-key'
      },
      endpoint: process.env.AWS_ENDPOINT_URL || undefined,
      forcePathStyle: !!process.env.AWS_ENDPOINT_URL // needed for MinIO
    });
  }

  private constructPath(tenantId: string, objectKey: string): string {
    // SECURITY: Enforce exact tenant prefix to prevent directory traversal
    const safeTenantId = tenantId.replace(/[^a-zA-Z0-9-]/g, '');
    const safeObjectKey = objectKey.replace(/[^a-zA-Z0-9.-]/g, '');
    return `tenants/${safeTenantId}/recovery/${safeObjectKey}`;
  }

  async upload(tenantId: string, objectKey: string, stream: Readable): Promise<string> {
    const key = this.constructPath(tenantId, objectKey);
    // Note: Node streams uploaded to S3 usually require @aws-sdk/lib-storage Upload for multipart.
    // However, since we might stream directly, we can use PutObjectCommand if body is fully bufferable,
    // or Upload for large streams. To keep dependencies minimal for the interface, we'll assume stream compatibility.
    const { Upload } = await import('@aws-sdk/lib-storage');
    
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: stream
      }
    });

    await upload.done();
    return `s3://${this.bucket}/${key}`;
  }

  async download(tenantId: string, objectKey: string): Promise<Readable> {
    const key = this.constructPath(tenantId, objectKey);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error('No body returned from S3');
    }
    
    return response.Body as Readable;
  }

  async deleteObject(tenantId: string, objectKey: string): Promise<void> {
    const key = this.constructPath(tenantId, objectKey);
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    await this.client.send(command);
  }

  async generateSignedUrl(tenantId: string, objectKey: string, expiresInSeconds = 3600): Promise<string> {
    const key = this.constructPath(tenantId, objectKey);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async verifyObjectExists(tenantId: string, objectKey: string): Promise<boolean> {
    const key = this.constructPath(tenantId, objectKey);
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') return false;
      throw error;
    }
  }

  async getObjectMetadata(tenantId: string, objectKey: string): Promise<any> {
    const key = this.constructPath(tenantId, objectKey);
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.client.send(command);
    return response.Metadata || {};
  }
}
