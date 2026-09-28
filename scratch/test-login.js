

async function run() {
  let rateLimitTriggered = false;
  for (let i = 0; i < 6; i++) {
    const res = await fetch('https://crm-v01-staging.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent123@example.com', password: 'WrongPassword123!' })
    });
    console.log(`Attempt ${i+1} Status: ${res.status}`);
    if (res.status === 429) rateLimitTriggered = true;
  }
  console.log(`Rate Limit Triggered: ${rateLimitTriggered}`);
}

run();
