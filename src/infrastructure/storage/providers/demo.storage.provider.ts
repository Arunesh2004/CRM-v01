import { StorageProvider } from '../storage.interface';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import crypto from 'crypto';

export class DemoStorageProvider implements StorageProvider {
  constructor(private tenantId: string) {}

  async upload(buffer: Buffer, fileName: string, mimeType: string, prefix?: string): Promise<string> {
    const prisma = withTenant(this.tenantId);
    
    // In serverless environments, saving to disk is not persistent.
    // Demo mode stores files as Base64 in the DemoStorage table.
    const base64Data = buffer.toString('base64');
    
    try {
      const demoStorage = await prisma.demoStorage.create({
        data: {
          tenantId: this.tenantId,
          fileName,
          mimeType,
          base64Data
        }
      });
      
      return `demo-storage://${demoStorage.id}`;
    } catch (e) {
      console.error('Demo Storage Upload Error:', e);
      throw e;
    }
  }

  async getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string> {
    if (!storageKey.startsWith('demo-storage://')) {
      return storageKey;
    }
    const id = storageKey.replace('demo-storage://', '');
    // In demo mode, we can return a mock endpoint that serves the base64 file
    return `/api/internal/demo-storage/${id}`;
  }

  async delete(storageKey: string): Promise<boolean> {
    if (!storageKey.startsWith('demo-storage://')) {
      return true;
    }
    const id = storageKey.replace('demo-storage://', '');
    const prisma = withTenant(this.tenantId);
    
    try {
      await prisma.demoStorage.deleteMany({
        where: { id, tenantId: this.tenantId }
      });
      return true;
    } catch (e) {
      console.error('Demo Storage Delete Error:', e);
      return false;
    }
  }
}
