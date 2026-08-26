import { StorageProvider } from './storage-provider.interface';
import { S3StorageProvider } from './providers/s3.provider';
import { MockStorageProvider } from './providers/mock-storage.provider';

export class StorageProviderFactory {
  static getProvider(): StorageProvider {
    const isDemo = process.env.APP_MODE === 'demo';

    if (isDemo) {
      return new MockStorageProvider();
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucket = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'auto';
    const endpoint = process.env.AWS_ENDPOINT_URL;

    if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
      throw new Error('Missing required AWS/R2 configuration for production StorageProvider. (APP_MODE is not "demo").');
    }

    return new S3StorageProvider(bucket, region, accessKeyId, secretAccessKey, endpoint);
  }
}
