const crypto = require('crypto');  
const token = { sub: 'e2e-admin-a-0000-0000-000000000000', exp: Math.floor(Date.now() / 1000) + 3600, purpose: 'crm-phase26-load-test' };  
const hmac = crypto.createHmac('sha256', 'e2e-secret-key-12345').update(JSON.stringify(token)).digest('hex');  
const fullToken = Buffer.from(JSON.stringify(token)).toString('base64url') + '.' + hmac;  
fetch('http://localhost:3008/communication/chat', { headers: { 'x-load-test-token': fullToken } }).then(r => console.log('STATUS:', r.status)).catch(e => console.error(e));  
fetch('http://localhost:3008/communication/chat', { headers: { 'x-load-test-token': fullToken } }).then(r => r.text().then(t => console.log('URL:', r.url, 'STATUS:', r.status, 'BODY:', t.substring(0, 100)))).catch(e => console.error(e));  
