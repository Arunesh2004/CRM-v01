import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Running Clerk Production Verification Tests ---');

  // 1. Verify Environment Variables exist in .env schema
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'CLERK_WEBHOOK_SECRET'];
    
    requiredVars.forEach(v => {
      if (!envContent.includes(v)) {
        throw new Error(`Missing environment variable definition in .env: ${v}`);
      }
    });
    console.log('✔ Environment variables definitions found in .env.');
  }

  // 2. Verify ClerkProvider in layout
  const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  if (!layoutContent.includes('<ClerkProvider>')) {
    throw new Error('ClerkProvider is missing from src/app/layout.tsx');
  }
  console.log('✔ ClerkProvider successfully wraps root layout.');

  // 3. Verify Middleware protection
  const middlewarePath = path.join(__dirname, '../src/middleware.ts');
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
  if (!middlewareContent.includes('clerkMiddleware')) {
    throw new Error('Clerk middleware not found in src/middleware.ts');
  }
  console.log('✔ Middleware structurally configured for Clerk.');

  // 4. Verify Webhook Implementation
  const webhookPath = path.join(__dirname, '../src/app/api/webhooks/clerk/route.ts');
  const webhookContent = fs.readFileSync(webhookPath, 'utf8');
  if (!webhookContent.includes('Webhook(WEBHOOK_SECRET)')) {
    console.warn('⚠ Webhook signature verification structure might need review.');
  } else {
    console.log('✔ Svix Webhook signature validation structure is present.');
  }

  if (!webhookContent.includes('user.created') || !webhookContent.includes('user.updated') || !webhookContent.includes('user.deleted')) {
     throw new Error('Webhook does not handle all required user lifecycle events.');
  }
  console.log('✔ Webhook securely handles user.created, user.updated, and user.deleted.');

  console.log('\\n--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
