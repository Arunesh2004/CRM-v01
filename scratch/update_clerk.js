fetch('https://api.clerk.com/v1/instance', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer sk_test_joHlZA8tlJffPi806U2yeS7NjXt36G59uDPBE1HLyV',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    allowed_origins: ['https://crm-v01.vercel.app', 'https://crm-v01-bb2k4wja4-arunesh-s-projects.vercel.app', 'http://localhost:3000']
  })
}).then(res => res.text()).then(console.log).catch(console.error);
