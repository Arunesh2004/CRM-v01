const fs = require('fs');
const content = fs.readFileSync('.env.test', 'utf8');
const keys = ['PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET', 'PUSHER_CLUSTER', 'NEXT_PUBLIC_PUSHER_KEY', 'NEXT_PUBLIC_PUSHER_CLUSTER'];

keys.forEach(k => {
  const isPresent = content.includes(k + '=');
  console.log(`${k}: ${isPresent ? 'PRESENT' : 'MISSING'}`);
});
