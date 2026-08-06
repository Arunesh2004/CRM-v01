import { sanitizeHtml, detectSqlInjection, checkPayloadLimit } from '../src/lib/security/sanitization';
import { isSecretExposedToFrontend, maskSecret } from '../src/lib/security/secrets';
import { SECURITY_HEADERS } from '../src/lib/security/headers';

async function runTests() {
  console.log('--- Running Security Production Audit Tests ---');

  // 1. Malicious Payload Rejection (XSS & SQLi)
  console.log('Testing XSS Sanitization...');
  const dirtyHtml = '<script>alert("xss")</script>';
  const cleanHtml = sanitizeHtml(dirtyHtml);
  if (cleanHtml.includes('<script>')) throw new Error('XSS Sanitization failed');
  console.log('✔ XSS Sanitization ok');

  console.log('Testing SQL Injection Detection...');
  const maliciousSql = "admin' OR '1'='1";
  const safeSql = "John Doe";
  if (!detectSqlInjection(maliciousSql)) throw new Error('SQLi detection failed on malicious input');
  if (detectSqlInjection(safeSql)) throw new Error('SQLi detection triggered on safe input');
  console.log('✔ SQLi Defensive Detection ok');

  // 2. Secret Leakage Prevention
  console.log('Testing Secret Management Policies...');
  const badKey = 'NEXT_PUBLIC_STRIPE_SECRET_KEY';
  const goodKey = 'STRIPE_SECRET_KEY';
  const allowedPubKey = 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY';
  
  if (!isSecretExposedToFrontend(badKey)) throw new Error('Failed to detect exposed secret');
  if (isSecretExposedToFrontend(goodKey)) throw new Error('False positive on private secret');
  if (isSecretExposedToFrontend(allowedPubKey)) throw new Error('False positive on publishable key');
  
  const masked = maskSecret('sk_test_1234567890abcdef');
  if (masked.includes('1234567890') || !masked.startsWith('sk_')) throw new Error('Masking failed');
  console.log('✔ Secret Leakage Preventives ok');

  // 3. Security Headers
  if (SECURITY_HEADERS['X-Frame-Options'] !== 'DENY') throw new Error('Missing clickjacking protection');
  if (!SECURITY_HEADERS['Content-Security-Policy'].includes("default-src 'self'")) throw new Error('Weak CSP');
  console.log('✔ Security Headers strictness ok');

  // 4. Payload Size Limit
  const largePayload = 'A'.repeat(1048577); // 1MB + 1 byte
  const normalPayload = 'A'.repeat(1024); // 1KB
  if (checkPayloadLimit(largePayload)) throw new Error('Failed to block oversized payload');
  if (!checkPayloadLimit(normalPayload)) throw new Error('Blocked normal payload');
  console.log('✔ DoS Payload Limits ok');

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
