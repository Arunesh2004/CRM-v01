const fs = require('fs');
const file = 'src/lib/observability/redact.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const SENSITIVE_KEYS = new Set([
  'password', 'token', 'accesstoken', 'refreshtoken', 'apikey', 'secret', 
  'authorization', 'cookie', 'set-cookie', 'set_cookie', 'clientsecret', 'webhooksecret',
  'privatekey'
]);`,
  `const SENSITIVE_KEYS = new Set([
  'password', 'token', 'accesstoken', 'refreshtoken', 'apikey', 'secret', 
  'authorization', 'cookie', 'set-cookie', 'set_cookie', 'clientsecret', 'webhooksecret',
  'privatekey'
]);

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  if (SENSITIVE_KEYS.has(k)) return true;
  return k.includes('token') || k.includes('secret') || k.includes('password') || k.includes('key') || k.includes('auth');
}`
);

content = content.replaceAll(
  'SENSITIVE_KEYS.has(key.toLowerCase())',
  'isSensitiveKey(key)'
);

fs.writeFileSync(file, content);
console.log('done');
