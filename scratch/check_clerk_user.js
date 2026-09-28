const https = require('https');

const options = {
  hostname: 'api.clerk.com',
  port: 443,
  path: '/v1/users/user_3I8YKETF8T1KUgt9lsRBsdBnEja',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer sk_test_joHlZA8tlJffPi806U2yeS7NjXt36G59uDPBE1HLyV'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
});
req.end();
