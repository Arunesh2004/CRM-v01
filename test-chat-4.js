const crypto = require('crypto');  
const token = { sub: 'e2e-admin-a-0000-0000-000000000000', exp: Date.now() + 3600000 };  
const hmac = crypto.createHmac('sha256', 'e2e-secret-key-12345').update(JSON.stringify(token)).digest('hex');  
const fullToken = Buffer.from(JSON.stringify(token)).toString('base64url') + '.' + hmac;  
fetch('http://localhost:3008/communication/chat', { redirect: 'manual', headers: { 'x-load-test-token': fullToken } }).then(r => console.log('STATUS:', r.status, 'HEADERS:', Object.fromEntries(r.headers.entries())));  
