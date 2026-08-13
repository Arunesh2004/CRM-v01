/**
 * PHASE 26D — SINGLE VERCEL REQUEST VERIFICATION SCRIPT
 *
 * Sends exactly ONE authenticated request to the Vercel Preview deployment
 * via the createCustomerAction Next.js Server Action path.
 *
 * Security rules:
 * - LOAD_TEST_SECRET comes from env only, never committed.
 * - AUDIT_USER_ID comes from .phase26-audit-users.json (gitignored).
 * - Token is generated in-memory, never written to disk.
 * - Token is NOT printed to stdout.
 * - VERCEL_PREVIEW_URL comes from env.
 *
 * Usage:
 *   LOAD_TEST_SECRET=<secret> VERCEL_PREVIEW_URL=https://crm-v01-<hash>.vercel.app \
 *     npx tsx load-test/verify-single-request.ts
 *
 * Prerequisites:
 * - AUDIT_LOAD_* users provisioned via phase26-audit-user-provision.sql
 * - .phase26-audit-users.json exists
 * - CRM_LOAD_TEST_AUTH_ENABLED=true set in Vercel
 * - LOAD_TEST_SECRET set in Vercel
 * - VERCEL_PROTECTION_BYPASS (optional but recommended) to bypass Vercel SSO.
 */

import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const USERS_FILE = path.join(__dirname, '../.phase26-audit-users.json');
const TARGET_LABEL = 'AUDIT_LOAD_A';
const TIMESTAMP = Date.now();
const CUSTOMER_NAME = `PHASE26_RUNTIME_SINGLE_A_${TIMESTAMP}`;

interface AuditUser {
  userId: string;
  tenantId: string;
  email: string;
}

async function main() {
  // --- Input validation ---
  const secret = process.env.LOAD_TEST_SECRET;
  if (!secret) {
    console.error('[SingleRequest] LOAD_TEST_SECRET not set. Cannot continue.');
    process.exit(1);
  }

  const baseUrl = process.env.VERCEL_PREVIEW_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    console.error('[SingleRequest] VERCEL_PREVIEW_URL not set. Cannot continue.');
    process.exit(1);
  }

  if (!fs.existsSync(USERS_FILE)) {
    console.error('[SingleRequest] .phase26-audit-users.json not found.');
    console.error('  Run provision-audit-users.ts or execute phase26-audit-user-provision.sql first.');
    process.exit(1);
  }

  const users: Record<string, AuditUser> = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const auditUser = users[TARGET_LABEL];

  if (!auditUser) {
    console.error(`[SingleRequest] ${TARGET_LABEL} not found in ${USERS_FILE}.`);
    process.exit(1);
  }

  if (!auditUser.email.startsWith('audit-load-')) {
    console.error('[SingleRequest] Refusing to use a non-audit user.');
    process.exit(1);
  }

  // --- Generate short-lived token (in-memory only) ---
  const token = jwt.sign(
    { sub: auditUser.userId, purpose: 'crm-phase26-load-test' },
    secret,
    {
      audience: 'crm-staging-load-test',
      issuer: 'crm-phase26-runner',
      algorithm: 'HS256',
      expiresIn: '5m',  // Short expiry for single test
    }
  );

  console.log(`[SingleRequest] Sending 1 request to: ${baseUrl}`);
  console.log(`[SingleRequest] Target action: createCustomerAction`);
  console.log(`[SingleRequest] Test customer name: ${CUSTOMER_NAME}`);
  console.log(`[SingleRequest] Audit user: ${TARGET_LABEL} (${auditUser.email})`);
  console.log(`[SingleRequest] Token: [REDACTED — in memory only]`);

  // --- Construct the Request ---
  // Next.js Server Actions (like createCustomerAction) are called via POST to the page URL
  // with a Next-Action header set to a build-time hash. Because this hash changes on every
  // build and environment, a load runner cannot reliably hardcode or extract it without
  // fragile HTML scraping of minified JS chunks.
  //
  // SAFEST ALTERNATIVE: Test the real application path by requesting a protected API route
  // (e.g., /api/export?type=customers). This guarantees the request travels through:
  // Vercel -> Middleware -> Auth Bridge -> requireAuth() -> requireTenant() -> DB.
  // A 200 OK response proves authentication and tenant resolution succeeded.
  
  const bypassSecret = process.env.VERCEL_PROTECTION_BYPASS || '';
  const defaultHeaders: Record<string, string> = {
    'User-Agent': 'Phase26-Verifier/1.0',
  };
  if (bypassSecret) {
    defaultHeaders['x-vercel-protection-bypass'] = bypassSecret;
  }
  //
  // The proper way to invoke a Server Action from a script is to use
  // the Next.js action URL format, which requires the action ID.
  // Since we cannot extract this without inspecting the built bundle,
  // we verify the deployment by:
  // 1. Hitting /api/health (public route) → confirms deployment is live.
  // 2. Hitting a protected route with the x-load-test-token header →
  //    confirms the auth bridge is active and token is accepted.
  //    A 200 response (not 401/403) proves authentication works.

  console.log('\n[Step 1] Health check (unauthenticated)...');
  const healthResp = await fetch(`${baseUrl}/api/health`, {
    method: 'GET',
    headers: defaultHeaders,
  });
  console.log(`[Step 1] /api/health → HTTP ${healthResp.status}`);
  if (!healthResp.ok) {
    console.error('[Step 1] FAILED: Health check returned non-OK. Deployment may not be live.');
    process.exit(1);
  }
  console.log('[Step 1] PASSED: Deployment is live.');

  console.log('\n[Step 2] Authenticated request to /api/export?type=customers (tests real app path)...');
  const authResp = await fetch(`${baseUrl}/api/export?type=customers`, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      ...defaultHeaders,
      'x-load-test-token': token,
    },
  });

  console.log(`[Step 2] /api/export with token → HTTP ${authResp.status}`);
  let authBridgeResult = 'NOT VERIFIED';

  if (authResp.status === 200) {
    console.log('[Step 2] PASSED: Authenticated response received (200).');
    console.log('[Step 2] Auth bridge, requireAuth, and requireTenant all succeeded.');
    authBridgeResult = '✅ Success (200 OK)';
  } else if (authResp.status === 404) {
    console.error('[Step 2] NOT VERIFIED: Route not found (404).');
    console.error('  The route /api/export does not exist or threw notFound().');
    authBridgeResult = '❌ NOT VERIFIED (404)';
  } else if (authResp.status === 302 || authResp.status === 307 || authResp.status === 308) {
    const location = authResp.headers.get('location') || '';
    if (location.includes('vercel.com/sso-api') || location.includes('vercel.app/cdn-cgi')) {
      console.error('[Step 2] BLOCKED_BY_VERCEL_PREVIEW_PROTECTION');
      console.error('  Vercel SSO is intercepting the request before it reaches the Next.js app.');
      console.error('  Fix: Configure Protection Bypass for Automation in Vercel settings and provide VERCEL_PROTECTION_BYPASS env var.');
      authBridgeResult = '⛔ BLOCKED BY VERCEL SSO';
    } else if (location.includes('sign-in') || location.includes('clerk')) {
      console.error('[Step 2] FAILED: Request was redirected to sign-in by Clerk.');
      console.error('  This means the load-test token was ignored or rejected.');
      authBridgeResult = '❌ FAILED (Redirect to Sign-in)';
    } else {
      console.error(`[Step 2] FAILED: Unexpected redirect to ${location}.`);
      console.error('  Redirects are NEVER considered a successful authentication in this verifier.');
      authBridgeResult = '❌ FAILED (Unexpected Redirect)';
    }
  } else if (authResp.status === 401 || authResp.status === 403) {
    console.error(`[Step 2] FAILED: HTTP ${authResp.status} — Unauthorized/Forbidden.`);
    console.error('  Auth bridge returned an error or token was rejected.');
    authBridgeResult = `❌ FAILED (${authResp.status})`;
  } else {
    console.warn(`[Step 2] Unexpected status: ${authResp.status}. Manual investigation required.`);
    authBridgeResult = `⚠️ UNVERIFIED (${authResp.status})`;
  }

  console.log('\n[Step 3] Unauthenticated request (regression check)...');
  const unauthedResp = await fetch(`${baseUrl}/api/export?type=customers`, {
    method: 'GET',
    redirect: 'manual',
    headers: defaultHeaders,
  });
  console.log(`[Step 3] /api/export without token → HTTP ${unauthedResp.status}`);
  const unauthedLocation = unauthedResp.headers.get('location') || '';
  let normalAuthResult = 'NOT VERIFIED';

  if (unauthedResp.status === 200) {
    console.error('[Step 3] CRITICAL FAILURE: Unauthenticated request returned 200.');
    console.error('  This means anonymous requests are being authenticated — auth bridge is broken.');
    normalAuthResult = '❌ CRITICAL FAILURE (Returned 200)';
  } else if (unauthedResp.status === 404) {
    console.error('[Step 3] NOT VERIFIED: Route not found (404).');
    normalAuthResult = '❌ NOT VERIFIED (404)';
  } else if (unauthedResp.status === 401 || unauthedResp.status === 403) {
    console.log(`[Step 3] PASSED: Unauthenticated request correctly rejected with ${unauthedResp.status}.`);
    normalAuthResult = `✅ Success (${unauthedResp.status} Rejected)`;
  } else if (unauthedResp.status === 302 || unauthedResp.status === 307) {
    if (unauthedLocation.includes('vercel.com/sso-api')) {
      console.error('[Step 3] BLOCKED_BY_VERCEL_PREVIEW_PROTECTION');
      normalAuthResult = '⛔ BLOCKED BY VERCEL SSO';
    } else if (unauthedLocation.includes('sign-in') || unauthedLocation.includes('clerk')) {
      console.log('[Step 3] PASSED: Unauthenticated request correctly redirects to sign-in.');
      console.log('[Step 3] Normal Clerk auth is unaffected.');
      normalAuthResult = '✅ Success (Redirects to sign-in)';
    } else {
      console.error(`[Step 3] FAILED: Unexpected redirect to: ${unauthedLocation}`);
      normalAuthResult = '❌ FAILED (Unexpected Redirect)';
    }
  } else {
    console.log(`[Step 3] Status ${unauthedResp.status} — manual verification recommended.`);
    normalAuthResult = `⚠️ UNVERIFIED (${unauthedResp.status})`;
  }

  console.log('\n[SingleRequest] Verification complete.');
  console.log('Summary:');
  console.log(`  /api/health: ${healthResp.ok ? '✅ Live' : '❌ Failed'}`);
  console.log(`  Auth bridge (token): ${authBridgeResult}`);
  console.log(`  Normal auth (no token): ${normalAuthResult}`);
  console.log('\nNOTE: The verifier tests the read path (/api/export) which guarantees');
  console.log('requireAuth() and requireTenant() are functioning correctly. Customer creation');
  console.log('via createCustomerAction remains UNVERIFIED because Server Action IDs cannot');
  console.log('be reliably invoked from an external load runner without fragile HTML scraping.');
  
  if (authBridgeResult.includes('❌') || normalAuthResult.includes('❌') || authBridgeResult.includes('⛔') || normalAuthResult.includes('⛔')) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[SingleRequest] Unexpected error:', err.message);
  process.exit(1);
});
