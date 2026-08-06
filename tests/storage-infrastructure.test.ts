import { S3StorageProvider } from '../src/lib/storage/providers/s3.provider';

async function runTests() {
  console.log('--- Running Storage Infrastructure Tests ---');
  
  // Initialize with fake credentials to test offline URL generation and validation
  const provider = new S3StorageProvider(
    'test-bucket',
    'us-east-1',
    'FAKE_ACCESS_KEY',
    'FAKE_SECRET_KEY'
  );

  const tenantId = 'tenant_123';

  // 1. Invalid file validation / Unauthorized access rejection (directory traversal)
  try {
    await provider.generateSignedDownloadUrl(tenantId, '../other-tenant/secret.pdf');
    throw new Error('Allowed directory traversal');
  } catch (err: any) {
    if (!err.message.includes('Invalid storage key traversal')) {
      throw new Error('Wrong error for directory traversal');
    }
    console.log('✔ Unauthorized access rejection (traversal blocked)');
  }

  // 2. Valid signed upload URL generation
  const uploadUrl = await provider.generateSignedUploadUrl(tenantId, 'recordings/video.mp4', 'video/mp4', 50);
  if (!uploadUrl.includes('test-bucket.s3.us-east-1.amazonaws.com/tenant_123/recordings/video.mp4')) {
    throw new Error('Generated upload URL is malformed or missing tenant isolation');
  }
  if (!uploadUrl.includes('X-Amz-Signature')) {
    throw new Error('Missing AWS Signature in upload URL');
  }
  console.log('✔ Valid Signed Upload URL generated with strict tenant boundary');

  // 3. Valid signed download URL generation
  const downloadUrl = await provider.generateSignedDownloadUrl(tenantId, 'recordings/video.mp4', 3600);
  if (!downloadUrl.includes('test-bucket.s3.us-east-1.amazonaws.com/tenant_123/recordings/video.mp4')) {
    throw new Error('Generated download URL is malformed');
  }
  console.log('✔ Valid Signed Download URL generated');
  
  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
