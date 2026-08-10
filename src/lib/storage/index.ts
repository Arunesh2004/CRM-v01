import { LocalStorageProvider } from './LocalStorageProvider';
import { S3CompatibleStorageProvider } from './S3CompatibleStorageProvider';
import type { StorageProvider } from './StorageProvider';
export type { StorageProvider };
// Factory pattern to get the appropriate storage provider based on environment
export function getStorageProvider(): StorageProvider {
  if (process.env.NODE_ENV === 'production' && process.env.STORAGE_PROVIDER === 's3') {
    return new S3CompatibleStorageProvider();
  }
  return new LocalStorageProvider();
}

export { LocalStorageProvider, S3CompatibleStorageProvider };
