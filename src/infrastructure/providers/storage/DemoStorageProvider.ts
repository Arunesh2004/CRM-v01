import { StorageProvider, StorageUploadPayload, StorageResponse } from './storage.interface';
import { ProviderContext, ProviderHealth } from '../base.interface';
import { Readable } from 'stream';

export class DemoStorageProvider implements StorageProvider {
  async checkHealth(): Promise<ProviderHealth> {
    return {
      status: 'READY',
      providerName: 'DemoStorageProvider',
      criticality: 'DEGRADED',
    };
  }

  async upload(context: ProviderContext, payload: StorageUploadPayload): Promise<StorageResponse> {
    console.log(`[DEMO_STORAGE] Uploading to key ${payload.key} (${payload.mimeType})`);

    return {
      url: `http://localhost:3000/demo-storage/${payload.key}`,
      key: payload.key,
      provider: 'DemoStorageProvider'
    };
  }

  async download(context: ProviderContext, key: string): Promise<Readable> {
    console.log(`[DEMO_STORAGE] Downloading key ${key}`);

    const stream = new Readable();
    stream.push(`[DEMO FILE CONTENT FOR KEY: ${key}]`);
    stream.push(null);
    return stream;
  }
}

