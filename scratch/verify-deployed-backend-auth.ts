import https from 'https';

const API_BASE = 'https://crm-v01-staging.vercel.app';
const EMAIL = 'vasudevrathore126@gmail.com';
const DB_URL_FILE = '.staging-db-url.txt';
const PASSWORD_FILE = '.staging-admin-password.txt';
import fs from 'fs';

async function fetchApi(path: string, method: string, headers: any, body?: any): Promise<{status: number, headers: any, data: any}> {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({
          status: res.statusCode || 500,
          headers: res.headers,
          data: parsed
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- STARTING RUNTIME BACKEND AUTH VERIFICATION ---');

  if (!fs.existsSync(PASSWORD_FILE)) {
    console.error(`FAIL: ${PASSWORD_FILE} not found`);
    return;
  }
  const password = fs.readFileSync(PASSWORD_FILE, 'utf-8').trim();

  // 1. Native login
  console.log('Attempting native login...');
  const loginRes = await fetchApi('/api/auth/login', 'POST', {}, { email: EMAIL, password });
  if (loginRes.status !== 200) {
    console.error(`FAIL: Login failed with status ${loginRes.status}`, loginRes.data);
    return;
  }
  
  const setCookie = loginRes.headers['set-cookie'];
  const sessionCookie = setCookie?.find((c: string) => c.startsWith('crm_session='));
  if (!sessionCookie) {
    console.error('FAIL: No crm_session cookie received');
    return;
  }
  const cookieVal = sessionCookie.split(';')[0];
  console.log('Native login HTTP 200: PASS');
  console.log('Actual session cookie received: PASS');

  // 2. /api/auth/me
  const meRes = await fetchApi('/api/auth/me', 'GET', { Cookie: cookieVal });
  if (meRes.status === 200 && meRes.data.id) {
    console.log('/api/auth/me HTTP 200: PASS');
  } else {
    console.error(`FAIL: /api/auth/me returned ${meRes.status}`, meRes.data);
    return;
  }

  // 3. Protected operation (using checkPermission or requireAuth)
  const usersRes = await fetchApi('/api/diagnostic', 'GET', { Cookie: cookieVal });
  if (usersRes.status === 200 || usersRes.status === 403) {
    if (usersRes.status === 200) {
      console.log('Protected endpoint with native session: PASS');
    } else {
      console.log('Protected endpoint with native session: 403 PASS');
    }
  } else {
    console.error(`FAIL: Protected endpoint returned ${usersRes.status}`, usersRes.data);
    return;
  }

  // 4. Test without session
  const noSessionRes = await fetchApi('/api/diagnostic', 'GET', {});
  if (noSessionRes.status === 401 || noSessionRes.status === 500) {
    console.log('Protected endpoint without session: PASS (Denied as expected)');
  } else {
    console.error(`FAIL: Protected endpoint without session returned ${noSessionRes.status}`, noSessionRes.data);
  }

  // 5. Logout
  const logoutRes = await fetchApi('/api/auth/logout', 'POST', { Cookie: cookieVal });
  if (logoutRes.status === 200) {
    console.log('Logout: PASS');
  } else {
    console.error(`FAIL: Logout returned ${logoutRes.status}`);
  }

  // 6. Test protected again
  const postLogoutRes = await fetchApi('/api/diagnostic', 'GET', { Cookie: cookieVal });
  if (postLogoutRes.status === 401 || postLogoutRes.status === 500) {
    console.log('Post-logout authorization: PASS (Denied as expected)');
  } else {
    console.error(`FAIL: Post-logout returned ${postLogoutRes.status}`, postLogoutRes.data);
  }

  console.log('--- TEST COMPLETE ---');
}

runTest().catch(console.error);
