const https = require('https');

const options = {
  hostname: 'api.clerk.com',
  port: 443,
  path: '/v1/users',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer sk_test_joHlZA8tlJffPi806U2yeS7NjXt36G59uDPBE1HLyV'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const users = JSON.parse(data);
      console.log('Total users:', users.length);
      if (Array.isArray(users)) {
        users.forEach(user => {
          console.log(`- ${user.id} | ${user.email_addresses[0]?.email_address}`);
        });
      } else {
        console.log(users);
      }
    } catch (e) {
      console.error('Error parsing:', e.message);
      console.log(data);
    }
  });
});
req.on('error', error => {
  console.error(error);
});
req.end();
