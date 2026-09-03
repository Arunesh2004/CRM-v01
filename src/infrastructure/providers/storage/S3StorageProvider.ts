import { StorageProvider, StorageUploadPayload, StorageResponse } from './storage.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';
import { Readable } from 'stream';
import { Logger } from '@/lib/logger/logger';

export class S3StorageProvider implements StorageProvider {
  name = 'S3StorageProvider';
  version = '1.0.0';
  private accessKeyId?: string;
  private secretAccessKey?: string;
  private region?: string;
  private bucketName?: string;

  constructor() {
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.region = process.env.AWS_REGION;
    this.bucketName = process.env.AWS_BUCKET_NAME;
  }

  async checkHealth(): Promise<ProviderHealth> {
    const isConfigured = !!(this.accessKeyId && this.secretAccessKey && this.region && this.bucketName);
    return {
      status: isConfigured ? 'READY' : 'MISSING_CREDENTIALS',
      providerName: this.name,
      criticality: 'CRITICAL',
      reason: isConfigured ? undefined : 'Missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, or AWS_BUCKET_NAME'
    };
  }

  async upload(context: ProviderContext, payload: StorageUploadPayload): Promise<StorageResponse> {
    if (!this.accessKeyId || !this.secretAccessKey || !this.region || !this.bucketName) {
      throw new Error('S3StorageProvider is unavailable: Missing credentials.');
    }

    // In a real environment:
    // const s3 = new S3Client({ region: this.region, credentials: { ... } });
    // await s3.send(new PutObjectCommand({ Bucket: this.bucketName, Key: payload.key, Body: payload.stream }));
    
    Logger.info(`[S3StorageProvider] Uploading file to s3...`, { bucket: this.bucketName, key: payload.key });
    
    return {
      url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${payload.key}`,
      key: payload.key,
      provider: this.name
    };
  }

  async download(context: ProviderContext, key: string): Promise<Readable> {
    if (!this.accessKeyId || !this.secretAccessKey || !this.region || !this.bucketName) {
      throw new Error('S3StorageProvider is unavailable: Missing credentials.');
    }

    Logger.info(`[S3StorageProvider] Downloading file from s3...`, { bucket: this.bucketName, key });
    // Mocking an empty readable stream
    const stream = new Readable();
    stream.push(null);
    return stream;
  }
}
