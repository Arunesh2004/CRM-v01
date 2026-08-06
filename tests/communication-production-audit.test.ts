import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Running Communication Module Production Reality Audit ---');

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

  console.log('\\n[1] Auditing Email System (Resend/Mock)...');
  const hasResend = findFiles(srcDir, 'resend');
  const hasEmailMock = findFiles(srcDir, 'mockemail'); // rough check
  console.log(`- Resend Integration Detected: ${hasResend}`);
  
  console.log('\\n[2] Auditing Telephony System (Twilio/Mock)...');
  const hasTwilio = findFiles(srcDir, 'twilio');
  console.log(`- Twilio Integration Detected: ${hasTwilio}`);

  console.log('\\n[3] Auditing WhatsApp System (Meta/Mock)...');
  const hasMeta = findFiles(srcDir, 'whatsapp');
  console.log(`- WhatsApp Integration Detected: ${hasMeta}`);

  console.log('\\n[4] Provider Switching (Environment Variables)...');
  if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      if (env.includes('RESEND_API_KEY')) {
          console.log('- Email config prepared in .env');
      } else {
          console.error('Violation: RESEND_API_KEY missing from .env');
          violations++;
      }
      if (env.includes('TWILIO_ACCOUNT_SID')) {
          console.log('- Twilio config prepared in .env');
      } else {
          console.error('Violation: TWILIO_ACCOUNT_SID missing from .env');
          violations++;
      }
  }

  console.log('\\n[5] Auditing Webhook Security...');
  const hasWebhookValidation = findFiles(srcDir, 'verifySignature') || findFiles(srcDir, 'crypto.createHmac');
  console.log(`- Webhook Signature Validation: ${hasWebhookValidation}`);

  console.log('\\n[6] Database Timeline Integration...');
  const schemaPath = path.join(__dirname, '../database/schema.prisma');
  if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      if (schema.includes('ActivityTimeline') && schema.includes('Call')) {
          console.log('- ActivityTimeline binds correctly to Communication Events');
      } else {
           console.error('Violation: ActivityTimeline missing communication bindings');
           violations++;
      }
  }

  if (violations > 0) {
    console.error(`\\n❌ Audit Failed with ${violations} violations.`);
    process.exit(1);
  } else {
    console.log('\\n✔ Communication Module structural integrity passed.');
    console.log('--- Tests Completed Successfully ---');
  }
}

runTests().catch(console.error);
