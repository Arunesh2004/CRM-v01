import { BaseProvider, ProviderContext } from '../base.interface';
import { Readable } from 'stream';

export interface StorageUploadPayload {
  key: string;
  stream: Readable;
  mimeType: string;
}

export interface StorageResponse {
  url: string;
  key: string;
  provider: string;
}

export interface StorageProvider extends BaseProvider {
  upload(context: ProviderContext, payload: StorageUploadPayload): Promise<StorageResponse>;
  download(context: ProviderContext, key: string): Promise<Readable>;
}
