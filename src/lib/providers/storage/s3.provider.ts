import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from '@/lib/config/env';
import fs from 'fs';

const isConfigured = !!(ENV.awsAccessKeyId && ENV.awsSecretAccessKey);
const isTest = process.env.NODE_ENV === 'test';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: ENV.awsAccessKeyId || (isTest ? 'mock-id' : ''),
    secretAccessKey: ENV.awsSecretAccessKey || (isTest ? 'mock-secret' : ''),
  },
  ...(process.env.AWS_S3_ENDPOINT ? { endpoint: process.env.AWS_S3_ENDPOINT } : {})
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'cctv-recordings-bucket';

export async function uploadFile(localFilePath: string, storageKey: string, mimeType?: string): Promise<void> {
  if (!isConfigured && !isTest) throw new Error('S3 provider is missing credentials');
  const fileStream = fs.createReadStream(localFilePath);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    Body: fileStream,
    ...(mimeType ? { ContentType: mimeType } : {})
  });

  await s3Client.send(command);
}

export async function deleteFile(storageKey: string): Promise<void> {
  if (!isConfigured && !isTest) throw new Error('S3 provider is missing credentials');
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  await s3Client.send(command);
}

export async function generateSignedDownloadUrl(storageKey: string, expiresInSeconds: number = 3600): Promise<string> {
  if (!isConfigured && !isTest) throw new Error('S3 provider is missing credentials');
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}
