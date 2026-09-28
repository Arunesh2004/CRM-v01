import jwt from 'jsonwebtoken';

const E2E_ADMIN_A_ID = 'e2e-admin-a-0000-0000-000000000000';
const secret = process.env.LOAD_TEST_SECRET || 'e2e-secret-key-12345';
const token = jwt.sign(
  { purpose: 'crm-phase26-load-test' },
  secret,
  {
    subject: E2E_ADMIN_A_ID,
    audience: 'crm-staging-load-test',
    issuer: 'crm-phase26-runner',
    expiresIn: '1h',
    algorithm: 'HS256'
  }
);

async function main() {
  const res = await fetch('http://localhost:3006/dashboard', {
    headers: {
      'x-load-test-token': token
    }
  });
  console.log('Dashboard Status:', res.status);
  const text = await res.text();
  console.log(text.includes('Page Not Found') ? 'Dashboard is 404' : 'Dashboard is OK');
}

main().catch(console.error);
