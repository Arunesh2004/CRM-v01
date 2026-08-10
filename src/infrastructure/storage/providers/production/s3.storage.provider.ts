import { StorageProvider } from '../../storage.interface';
import { ProviderNotImplementedError } from '../../../errors';

export class S3StorageProvider implements StorageProvider {
  constructor(private credentials: any) {}

  async upload(buffer: Buffer, fileName: string, mimeType: string, prefix?: string): Promise<string> {
    throw new ProviderNotImplementedError('AWS S3', 'upload');
  }

  async getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string> {
    throw new ProviderNotImplementedError('AWS S3', 'getSignedUrl');
  }

  async delete(storageKey: string): Promise<boolean> {
    throw new ProviderNotImplementedError('AWS S3', 'delete');
  }
}
