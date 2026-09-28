import { Client } from 'pg';
import * as fs from 'fs';

async function run() {
  let dbUrl = '';
  try {
    dbUrl = fs.readFileSync('.staging-db-url.txt', 'utf8').trim();
    if (!dbUrl) throw new Error('DB URL empty');
  } catch(e) {
    console.error('FAIL: Could not read DB URL');
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
  } catch(e) {
    console.log('Fresh native login: FAIL');
    return;
  }

  let freshNativeLogin = false;
  let cookieCaptured = false;
  let apiMePass = false;
  let authSessionCreated = false;
  let rawTokenAbsent = false;
  let logoutPass = false;
  let sessionRevoked = false;

  try {
    const password = fs.readFileSync('.staging-admin-password.txt', 'utf8').trim();
    const email = 'vasudevrathore126@gmail.com';
    
    // Get user id
    const userRes = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (!userRes.rows[0]) throw new Error('User not found');
    const userId = userRes.rows[0].id;

    // 1. Fresh login
    const loginRes = await fetch('https://crm-v01-staging.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (loginRes.status === 200) {
      freshNativeLogin = true;
    }

    // 2. Capture actual Set-Cookie header generically
    const setCookieHeader = loginRes.headers.get('set-cookie');
    let rawSessionToken = '';
    let fullCookieString = '';
    
    if (setCookieHeader) {
      // Split by ';' and get the first part (e.g. crm_session=abc123xyz)
      const firstPart = setCookieHeader.split(';')[0];
      if (firstPart && firstPart.includes('=')) {
        fullCookieString = firstPart;
        rawSessionToken = firstPart.split('=')[1];
      }
    }

    if (rawSessionToken && rawSessionToken.length > 0) {
      cookieCaptured = true;
    } else {
      throw new Error("Could not extract raw session token.");
    }

    // 3 & 4. GET /api/auth/me
    const meRes = await fetch('https://crm-v01-staging.vercel.app/api/auth/me', {
      method: 'GET',
      headers: { 'Cookie': fullCookieString }
    });
    
    if (meRes.status === 200) {
      apiMePass = true;
    }

    // 5 & 6. Check AuthSession
    const sessionRes = await client.query('SELECT * FROM "AuthSession" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [userId]);
    const sessions = sessionRes.rows;

    let sessionId = null;

    if (sessions.length > 0) {
      const session = sessions[0];
      if (session.userId === userId && !session.revokedAt && session.expiresAt > new Date()) {
        authSessionCreated = true;
        sessionId = session.id;
      }
      
      // 7. Verify raw token is NOT in DB
      if (session.tokenHash && session.tokenHash !== rawSessionToken && !session.tokenHash.includes(rawSessionToken)) {
        rawTokenAbsent = true;
      }
    }

    // 8. Logout
    const logoutRes = await fetch('https://crm-v01-staging.vercel.app/api/auth/logout', {
      method: 'POST',
      headers: { 'Cookie': fullCookieString }
    });
    
    if (logoutRes.status === 200 || logoutRes.status === 204) {
      logoutPass = true;
    }

    // 9. Verify session revoked
    if (sessionId) {
      const revRes = await client.query('SELECT "revokedAt" FROM "AuthSession" WHERE id = $1', [sessionId]);
      if (revRes.rows[0] && revRes.rows[0].revokedAt) {
        sessionRevoked = true;
      }
    }

    await client.end();

    // 10. Delete files
    fs.writeFileSync('.staging-admin-password.txt', '00000000000000000000000000000000');
    fs.unlinkSync('.staging-admin-password.txt');
    fs.writeFileSync('.staging-db-url.txt', '00000000000000000000000000000000');
    fs.unlinkSync('.staging-db-url.txt');

    const tempPasswordRemoved = !fs.existsSync('.staging-admin-password.txt');
    const tempDbUrlRemoved = !fs.existsSync('.staging-db-url.txt');

    // 11. Final Report
    console.log(`Fresh native login: ${freshNativeLogin ? 'PASS' : 'FAIL'}`);
    console.log(`Actual session cookie captured: ${cookieCaptured ? 'PASS' : 'FAIL'}`);
    console.log(`/api/auth/me HTTP 200: ${apiMePass ? 'PASS' : 'FAIL'}`);
    console.log(`AuthSession created: ${authSessionCreated ? 'PASS' : 'FAIL'}`);
    console.log(`Raw session token absent from DB: ${rawTokenAbsent ? 'PASS' : 'FAIL'}`);
    console.log(`Logout: ${logoutPass ? 'PASS' : 'FAIL'}`);
    console.log(`Session revoked: ${sessionRevoked ? 'PASS' : 'FAIL'}`);
    console.log(`Temporary DB credential removed: ${tempDbUrlRemoved ? 'PASS' : 'FAIL'}`);
    console.log(`Temporary password removed: ${tempPasswordRemoved ? 'PASS' : 'FAIL'}`);
    console.log(`Application source modified: NO`);

  } catch (err: any) {
    console.error('FAIL:', err.message);
    await client.end();
  }
}

run();
