import http from 'k6/http';
import { check, sleep } from 'k6';

const URL = __ENV.K6_ENV_URL;
const ACTION_ID = __ENV.K6_ENV_ACTION_ID;
const RUN_ID = __ENV.K6_ENV_RUN_ID;
// JSON object mapping alias to token: { 'AUDIT_LOAD_A': 'jwt...', 'AUDIT_LOAD_B': 'jwt...' }
const TOKENS_MAP = JSON.parse(__ENV.K6_ENV_TOKENS_MAP || '{}');
const ALIASES = Object.keys(TOKENS_MAP);

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'], 
    http_req_duration: ['p(95)<800', 'p(99)<1200'], 
  },
};

export default function () {
  const alias = ALIASES[Math.floor(Math.random() * ALIASES.length)];
  const token = TOKENS_MAP[alias];
  
  // deterministic sequence based on VU and iteration
  const seq = `${__VU}_${__ITER}`;
  const customerName = `PHASE26E_${RUN_ID}_${alias}_${seq}`;

  const payload = JSON.stringify([{ name: customerName }]);

  const res = http.post(`${URL}/customers`, payload, {
    headers: {
      'Next-Action': ACTION_ID,
      'Content-Type': 'text/plain;charset=UTF-8',
      'x-load-test-token': token,
      'x-vercel-protection-bypass': __ENV.K6_ENV_BYPASS || '',
    },
    redirects: 0, // Enforce Step 8: DO NOT follow redirects
  });

  const isVercelSSO = res.status === 302 && res.headers['Location'] && res.headers['Location'].includes('vercel.com/sso-api');

  if (isVercelSSO) {
    console.error('ABORT — Vercel SSO intercept detected. x-vercel-protection-bypass is missing or invalid.');
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'not vercel sso intercept': (r) => !isVercelSSO,
    'success payload': (r) => r.body && r.body.includes('"success":true'),
  });

  sleep(1);
}
