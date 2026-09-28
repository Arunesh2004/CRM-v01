fetch('https://api.clerk.com/v1/instance', {
  headers: {
    'Authorization': 'Bearer sk_test_joHlZA8tlJffPi806U2yeS7NjXt36G59uDPBE1HLyV'
  }
}).then(res => res.json()).then(data => {
  console.log('Environment:', data.environment_type);
  console.log('Allowed Origins:', data.allowed_origins);
}).catch(console.error);
