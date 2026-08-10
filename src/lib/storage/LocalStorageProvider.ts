import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { StorageProvider } from './StorageProvider';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir: string = path.join(process.cwd(), '.storage')) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getTenantPath(tenantId: string) {
    const tenantPath = path.join(this.baseDir, tenantId);
    if (!fs.existsSync(tenantPath)) {
      fs.mkdirSync(tenantPath, { recursive: true });
    }
    return tenantPath;
  }

  async upload(tenantId: string, objectKey: string, stream: Readable): Promise<string> {
    const tenantPath = this.getTenantPath(tenantId);
    const filePath = path.join(tenantPath, objectKey);
    const writeStream = fs.createWriteStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream)
        .on('finish', () => resolve(`local://${tenantId}/${objectKey}`))
        .on('error', reject);
    });
  }

  async download(tenantId: string, objectKey: string): Promise<Readable> {
    const filePath = path.join(this.getTenantPath(tenantId), objectKey);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Object not found: ${objectKey}`);
    }
    return fs.createReadStream(filePath);
  }

  async deleteObject(tenantId: string, objectKey: string): Promise<void> {
    const fullPath = path.join(this.getTenantPath(tenantId), objectKey);
    // Explicit tenant boundary validation
    if (!fullPath.includes(path.normalize(`/${tenantId}/`)) && !fullPath.includes(path.normalize(`\\${tenantId}\\`))) {
       throw new Error('Storage Path Traversal Attempt Blocked');
    }
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async getObjectMetadata(tenantId: string, objectKey: string): Promise<any> {
    const fullPath = path.join(this.getTenantPath(tenantId), objectKey);
    if (!fs.existsSync(fullPath)) throw new Error('Object not found');
    const stat = await fs.promises.stat(fullPath);
    return { size: stat.size, createdAt: stat.birthtime };
  }

  async generateSignedUrl(tenantId: string, objectKey: string, expiresInSeconds: number = 3600): Promise<string> {
    return `mock-signed-url://${tenantId}/${objectKey}?expires=${Date.now() + expiresInSeconds * 1000}`;
  }

  async verifyObjectExists(tenantId: string, objectKey: string): Promise<boolean> {
    const fullPath = path.join(this.getTenantPath(tenantId), objectKey);
    return fs.existsSync(fullPath);
  }
}
