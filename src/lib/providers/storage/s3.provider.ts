import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '@/lib/config/env';
import fs from 'fs';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: ENV.awsAccessKeyId || 'mock-id',
    secretAccessKey: ENV.awsSecretAccessKey || 'mock-secret',
  },
  ...(process.env.AWS_S3_ENDPOINT ? { endpoint: process.env.AWS_S3_ENDPOINT } : {})
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'cctv-recordings-bucket';

export async function uploadFile(localFilePath: string, storageKey: string): Promise<void> {
  const fileStream = fs.createReadStream(localFilePath);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    Body: fileStream,
  });

  await s3Client.send(command);
}

export async function deleteFile(storageKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  await s3Client.send(command);
}
