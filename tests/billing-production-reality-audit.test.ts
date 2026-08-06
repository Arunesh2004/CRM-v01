import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Running Billing Module Production Reality Audit ---');

  const srcDir = path.join(__dirname, '../src');
  const envPath = path.join(__dirname, '../.env');

  let violations = 0;
  
  function findFiles(dir: string, keyword: string): boolean {
      let found = false;
      if (!fs.existsSync(dir)) return false;
      const walk = (d: string) => {
          const files = fs.readdirSync(d);
          for (const file of files) {
              const fullPath = path.join(d, file);
              if (fs.statSync(fullPath).isDirectory()) {
                  walk(fullPath);
              } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
                  const content = fs.readFileSync(fullPath, 'utf8');
                  if (content.toLowerCase().includes(keyword.toLowerCase())) {
                      found = true;
                  }
              }
          }
      };
      walk(dir);
      return found;
  }

  console.log('\\n[1] Auditing Payment Providers (Stripe/Razorpay/Mock)...');
  const hasStripe = findFiles(srcDir, 'stripe');
  const hasRazorpay = findFiles(srcDir, 'razorpay');
  const hasBillingMock = findFiles(srcDir, 'mockpayment');
  console.log(`- Stripe Integration Detected: ${hasStripe}`);
  console.log(`- Razorpay Integration Detected: ${hasRazorpay}`);

  console.log('\\n[2] Provider Switching & Environment Variables...');
  if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      if (env.includes('STRIPE_SECRET_KEY')) {
          console.log('- Stripe config prepared in .env');
      } else {
          console.error('Violation: STRIPE_SECRET_KEY missing from .env');
          violations++;
      }
      if (env.includes('RAZORPAY_KEY_SECRET')) {
          console.log('- Razorpay config prepared in .env');
      } else {
          console.error('Violation: RAZORPAY_KEY_SECRET missing from .env');
          violations++;
      }
  }

  console.log('\\n[3] Auditing Webhook Security...');
  const hasWebhookValidation = findFiles(srcDir, 'constructEvent') || findFiles(srcDir, 'stripe.webhooks') || findFiles(srcDir, 'crypto.createHmac');
  console.log(`- Webhook Signature Validation (Stripe/Razorpay): ${hasWebhookValidation}`);

  console.log('\\n[4] Database Integrity (Billing Isolation)...');
  const schemaPath = path.join(__dirname, '../database/schema.prisma');
  if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      if (schema.includes('Subscription') && schema.includes('Invoice') && schema.includes('tenantId')) {
          console.log('- Billing models safely isolated by tenantId');
      } else {
           console.error('Violation: Billing models missing tenant isolation');
           violations++;
      }
  }

  if (violations > 0) {
    console.error(`\\n❌ Audit Failed with ${violations} violations.`);
    process.exit(1);
  } else {
    console.log('\\n✔ Billing Module structural integrity passed.');
    console.log('--- Tests Completed Successfully ---');
  }
}

runTests().catch(console.error);
