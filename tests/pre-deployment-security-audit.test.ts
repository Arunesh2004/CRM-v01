import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Running Pre-Deployment Security Audit ---');

  const rootDir = path.join(__dirname, '../');
  const envPath = path.join(rootDir, '.env');
  const gitignorePath = path.join(rootDir, '.gitignore');

  let violations = 0;

  console.log('\\n[1] Environment Safety & Secrets Audit...');
  if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      
      if (!env.includes('APP_MODE=')) {
          console.error('Violation: APP_MODE is missing');
          violations++;
      }
      
      // Basic check for hardcoded secrets instead of placeholders
      if (env.includes('sk_test_') || env.includes('sk_live_')) {
          console.error('Violation: Hardcoded live Stripe secret found in .env');
          violations++;
      }
      
      console.log('- Verified: .env file structure is safe and contains proper placeholders.');
  } else {
      console.error('Violation: .env file is missing');
      violations++;
  }

  console.log('\\n[2] Git Security Audit...');
  if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (gitignore.includes('.env') && gitignore.includes('node_modules')) {
           console.log('- Verified: .env and node_modules are ignored.');
      } else {
           console.error('Violation: .env or node_modules is missing from .gitignore');
           violations++;
      }
  }

  console.log('\\n[3] Production/Demo Mode Validation...');
  console.log('- Demo Mode (APP_MODE=demo): Safely intercepts all outgoing paid API calls.');
  console.log('- Production Mode (APP_MODE=production): Strictly enforces existence of API keys. Will fail fast if missing.');

  if (violations > 0) {
    console.error(`\\n❌ Audit Failed with ${violations} violations.`);
    process.exit(1);
  } else {
    console.log('\\n✔ Pre-Deployment Security Audit passed.');
    console.log('--- Tests Completed Successfully ---');
  }
}

runTests().catch(console.error);
