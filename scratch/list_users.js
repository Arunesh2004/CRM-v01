const fetch = require('node-fetch') || globalThis.fetch;

async function listUsers() {
  try {
    const res = await fetch('https://api.clerk.com/v1/users', {
      headers: {
        'Authorization': 'Bearer sk_test_joHlZA8tlJffPi806U2yeS7NjXt36G59uDPBE1HLyV'
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('Total users:', data.length);
    data.forEach(user => {
      console.log(`- ${user.id} | ${user.email_addresses[0]?.email_address}`);
    });
  } catch (err) {
    console.error(err);
  }
}

listUsers();
