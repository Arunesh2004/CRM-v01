import { validateEnvironment } from '../src/lib/config/env';

function testBoot(description: string, setup: () => void, expectError: boolean) {
  const backup = { ...process.env };
  try {
    setup();
    validateEnvironment();
    if (expectError) {
      console.error(`FAIL: Expected error for ${description} but boot succeeded.`);
      process.exit(1);
    } else {
      console.log(`SUCCESS: Boot succeeded as expected for ${description}.`);
    }
  } catch (e: any) {
    if (expectError) {
      console.log(`SUCCESS: Safely failed closed for ${description}. Error: ${e.message}`);
    } else {
      console.error(`FAIL: Unexpected error for ${description}. Error: ${e.message}`);
      process.exit(1);
    }
  } finally {
    process.env = backup;
  }
}

console.log('--- Phase 13 Boot Failure Testing ---');

process.env.NODE_ENV = 'production';
process.env.VERCEL_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://user:pass@some-db.aws.com/db';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_live_something';
process.env.CLERK_SECRET_KEY = 'sk_live_something';
process.env.CLERK_WEBHOOK_SECRET = 'whsec_something';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';

testBoot('Valid Production Setup', () => {}, false);

testBoot('Missing DATABASE_URL', () => { delete process.env.DATABASE_URL; }, true);
testBoot('Localhost DATABASE_URL in Production', () => { process.env.DATABASE_URL = 'postgresql://localhost:5432'; }, true);

testBoot('Missing Clerk Secret', () => { delete process.env.CLERK_SECRET_KEY; }, true);

testBoot('Leaked Secret Prefix (NEXT_PUBLIC_SECRET_XYZ)', () => { process.env.NEXT_PUBLIC_SECRET_TEST = '123'; }, true);

testBoot('Safe Degradation: Missing CCTV Token', () => { 
  delete process.env.CCTV_STREAM_JWT_SECRET;
  process.env.MEDIAMTX_API_URL = 'http://test';
}, false);
