import { validateEnvironment } from '../src/lib/config/env';

async function runTests() {
  console.log('--- Running Deployment Readiness Tests ---');

  // 1. Environment validation (Missing required vars)
  const originalEnv = { ...process.env };
  
  process.env = {
    DATABASE_URL: 'valid',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'valid',
    CLERK_WEBHOOK_SECRET: 'valid'
    // CLERK_SECRET_KEY intentionally missing
  };
  
  try {
    validateEnvironment();
    throw new Error('Allowed startup without required secrets');
  } catch (err: any) {
    if (!err.message.includes('Missing required environment variables: CLERK_SECRET_KEY')) {
      throw err;
    }
    console.log('✔ Environment validation blocks missing secrets');
  }

  // 2. Production safety checks (Localhost DB in prod)
  process.env = { ...originalEnv };
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.CLERK_SECRET_KEY = 'valid';
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'valid';
  process.env.CLERK_WEBHOOK_SECRET = 'valid';

  try {
    validateEnvironment();
    throw new Error('Allowed localhost DB in production');
  } catch (err: any) {
    if (!err.message.includes('DATABASE_URL cannot point to localhost in production')) {
      throw err;
    }
    console.log('✔ Production safety correctly blocks localhost DB');
  }

  // 3. Debug mode block
  process.env.DATABASE_URL = 'postgresql://user:pass@aws-rds.amazonaws.com/db';
  process.env.NEXT_PUBLIC_DEBUG = 'true';
  try {
    validateEnvironment();
    throw new Error('Allowed debug mode in production');
  } catch (err: any) {
    if (!err.message.includes('Debug mode must be disabled in production')) {
      throw err;
    }
    console.log('✔ Production safety correctly blocks debug mode');
  }
  
  // Cleanup
  process.env = { ...originalEnv };

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
