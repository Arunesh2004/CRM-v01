const https = require('https');

const postData = JSON.stringify({
  email_address: 'demo@company.com',
  public_metadata: { role: 'admin' },
  ignore_existing: true
});

const options = {
  hostname: 'api.clerk.com',
  port: 443,
  path: '/v1/invitations',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_joHlZA8tlJffPi806U2yeS7NjXt36G59uDPBE1HLyV',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(res.statusCode, data);
  });
});
req.on('error', e => console.error(e));
req.write(postData);
req.end();
