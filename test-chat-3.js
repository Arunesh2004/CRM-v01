const crypto = require('crypto');  
const token = { sub: 'e2e-admin-a-0000-0000-000000000000', exp: Date.now() + 3600000 };  
const hmac = crypto.createHmac('sha256', 'e2e-secret-key-12345').update(JSON.stringify(token)).digest('hex');  
const fullToken = Buffer.from(JSON.stringify(token)).toString('base64url') + '.' + hmac;  
fetch('http://localhost:3008/communication/chat', { headers: { 'x-load-test-token': fullToken } }).then(r => r.text()).then(t => console.log(t.substring(0, 5000)));  
