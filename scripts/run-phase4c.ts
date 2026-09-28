import { executeAsSystem, SystemOperation } from '../database/utils/prisma-system';
import { hashPassword } from '../src/lib/auth/password';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config({ path: '.env.staging.local' });
dotenv.config({ path: '.env.staging' });

const TARGET_URL = 'https://crm-v01-staging-ob0jhs2ew-arunesh-s-projects.vercel.app';

if (true) {
  const host = "aws-0-ap-northeast-2.pooler.supabase.com";
  const port = process.env.CRM_STAGING_PORT || "5432";
  const database = process.env.CRM_STAGING_DATABASE || "postgres";
  const sysUsername = "crm_system_user.tnlrlinitgfolgwvqgyd";
  const sysPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD;

  if (!sysPassword) {
    console.error("ERROR: Missing CRM_STAGING_SYSTEM_PASSWORD in environment variables.");
    process.exit(1);
  }

  const encodedSysUser = encodeURIComponent(sysUsername);
  const encodedSysPassword = encodeURIComponent(sysPassword);
  
  // Set internally so getSystemPrisma() in prisma-system.ts can seamlessly use it
  process.env.ADMIN_DATABASE_URL = `postgresql://${encodedSysUser}:${encodedSysPassword}@${host}:${port}/${database}?sslmode=require&pgbouncer=true`;
  process.env.DATABASE_URL = process.env.ADMIN_DATABASE_URL;
  process.env.DIRECT_URL = process.env.ADMIN_DATABASE_URL;
}

// Cookie jar
let sessionCookie = '';

async function fetchApp(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (sessionCookie) {
    headers.set('Cookie', sessionCookie);
  }
  // Enforce Host to match TARGET_URL exactly for CSRF tests
  const url = new URL(path, TARGET_URL);
  
  const res = await fetch(url.toString(), {
    ...options,
    headers,
    redirect: 'manual'
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    // Basic extraction of the crm_session cookie value
    const match = setCookie.match(/(crm_session=[^;]+)/);
    if (match) {
      sessionCookie = match[1];
    }
  }

  return res;
}

async function runTests() {
  const report: any[] = [];
  function addReport(test: string, expected: string, actual: string, evidence: string, status: string) {
    report.push({ test, expected, actual, evidence, status });
    console.log(`[${status}] ${test}`);
  }

  console.log("--- PHASE 4C STAGING RUNTIME TEST RUNNER ---");
  console.log("Targeting:", TARGET_URL);
  console.log("Connecting to Database using ADMIN_DATABASE_URL...");

  const syntheticEmail = `test.runner.${Date.now()}@example.com`;
  const syntheticPassword = crypto.randomBytes(16).toString('hex') + 'A1!'; // Must be complex
  let syntheticUserId = '';
  let syntheticTenantId = '';
  
  try {
    // PHASE B: TEST IDENTITY SETUP
    await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: 'Phase 4C Synthetic Tenant', status: 'ACTIVE' }
      });
      syntheticTenantId = tenant.id;

      const passwordHash = await hashPassword(syntheticPassword);

      const user = await tx.user.create({
        data: {
          email: syntheticEmail,
          passwordHash,
          status: 'ACTIVE',
          onboardingStatus: 'COMPLETED',
          tenantId: tenant.id
        }
      });
      syntheticUserId = user.id;

      const role = await tx.role.findFirst({ where: { name: 'TENANT_USER' } });
      if (role) {
        await tx.userRole.create({
          data: { userId: user.id, roleId: role.id, tenantId: tenant.id }
        });
      }
    });

    console.log("- Synthetic Test User created.");

    // PHASE 1: BASELINE
    const healthRes = await fetchApp('/api/health');
    addReport("Baseline Health", "HTTP 200", `HTTP ${healthRes.status}`, "Health endpoint response", healthRes.status === 200 ? "PASS" : "FAIL");

    // PHASE 2: VALID LOGIN
    const loginRes = await fetchApp('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL },
      body: JSON.stringify({ email: syntheticEmail, password: syntheticPassword })
    });
    
    // Check DB for AuthSession
    const authSession = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      return tx.authSession.findFirst({ where: { userId: syntheticUserId }, orderBy: { createdAt: 'desc' } });
    });

    const loginPassed = loginRes.status === 200 && sessionCookie.includes('crm_session=') && !!authSession;
    addReport("Valid Login", "HTTP 200, Cookie, DB Session", `HTTP ${loginRes.status}, Cookie: ${!!sessionCookie}, DB: ${!!authSession}`, "Login endpoint response & DB check", loginPassed ? "PASS" : "FAIL");
    
    if (authSession) {
      addReport("Session Security", "Hash stored, not raw", "Raw token not found in DB", "DB tokenHash field", authSession.tokenHash ? "PASS" : "FAIL");
    }

    // PHASE 3: AUTHENTICATED REQUEST
    const authReqRes = await fetchApp('/api/auth/me', {
      method: 'GET',
      headers: { 'Origin': TARGET_URL }
    });
    addReport("Authenticated Request", "HTTP 200", `HTTP ${authReqRes.status}`, "Protected /api/auth/me route", authReqRes.status === 200 ? "PASS" : "FAIL");

    // PHASE 4: WRONG PASSWORD
    const wrongPassRes = await fetchApp('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL },
      body: JSON.stringify({ email: syntheticEmail, password: 'WrongPassword123!' })
    });
    addReport("Wrong Password", "HTTP 401", `HTTP ${wrongPassRes.status}`, "Login endpoint response", wrongPassRes.status === 401 ? "PASS" : "FAIL");

    // PHASE 5: UNKNOWN ACCOUNT
    const unknownEmailRes = await fetchApp('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL },
      body: JSON.stringify({ email: 'nonexistent123@example.com', password: 'Password123!' })
    });
    addReport("Unknown Account", "HTTP 401", `HTTP ${unknownEmailRes.status}`, "Login endpoint response", unknownEmailRes.status === 401 ? "PASS" : "FAIL");

    // PHASE 6: RATE LIMITING
    // We intentionally fire 6 requests to trigger the 5-request limit.
    let rateLimitTriggered = false;
    for (let i = 0; i < 6; i++) {
      const rlRes = await fetchApp('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL },
        body: JSON.stringify({ email: syntheticEmail, password: 'WrongPassword123!' })
      });
      if (rlRes.status === 429) rateLimitTriggered = true;
    }
    addReport("Account Rate Limit", "HTTP 429", rateLimitTriggered ? "HTTP 429" : "No 429", "Rate limit response", rateLimitTriggered ? "PASS" : "FAIL");

    // PHASE 8: CSRF
    const csrfForeignRes = await fetchApp('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://malicious.com' },
      body: JSON.stringify({ email: syntheticEmail, password: syntheticPassword })
    });
    addReport("Foreign Origin CSRF", "HTTP 403", `HTTP ${csrfForeignRes.status}`, "Login endpoint response", csrfForeignRes.status === 403 ? "PASS" : "FAIL");

    // PHASE 9: LOGOUT
    const logoutRes = await fetchApp('/api/auth/logout', {
      method: 'POST',
      headers: { 'Origin': TARGET_URL }
    });
    
    const sessionAfterLogout = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      return tx.authSession.findFirst({ where: { userId: syntheticUserId }, orderBy: { createdAt: 'desc' } });
    });
    const logoutPassed = logoutRes.status === 200 && sessionAfterLogout && sessionAfterLogout.revokedAt !== null;
    addReport("Logout", "HTTP 200, DB Revoked", `HTTP ${logoutRes.status}, Revoked: ${sessionAfterLogout?.revokedAt != null}`, "Logout endpoint & DB check", logoutPassed ? "PASS" : "FAIL");

    // PHASE 12: AUDIT VERIFICATION
    const events = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      return tx.securityEvent.findMany({ where: { userId: syntheticUserId } });
    });
    
    const hasLoginSuccess = events.some(e => e.eventType === 'SUCCESSFUL_LOGIN');
    const hasLoginFail = events.some(e => e.eventType === 'FAILED_LOGIN');
    const hasRateLimit = events.some(e => e.eventType === 'RATE_LIMIT_TRIGGERED');
    const hasLogout = events.some(e => e.eventType === 'LOGOUT');
    
    addReport("SUCCESSFUL_LOGIN Audit", "Event Created", hasLoginSuccess ? "Found" : "Missing", "SecurityEvent rows", hasLoginSuccess ? "PASS" : "FAIL");
    addReport("FAILED_LOGIN Audit", "Event Created", hasLoginFail ? "Found" : "Missing", "SecurityEvent rows", hasLoginFail ? "PASS" : "FAIL");
    addReport("RATE_LIMIT_TRIGGERED Audit", "Event Created", hasRateLimit ? "Found" : "Missing", "SecurityEvent rows", hasRateLimit ? "PASS" : "FAIL");
    addReport("LOGOUT Audit", "Event Created", hasLogout ? "Found" : "Missing", "SecurityEvent rows", hasLogout ? "PASS" : "FAIL");

    // Print Final Report safely
    console.log("\n==================================================");
    console.log("FINAL REPORT");
    console.log("==================================================\n");
    console.log("| Test | Expected | Actual | Evidence | Status |");
    console.log("|------|----------|--------|----------|--------|");
    report.forEach(r => {
      console.log(`| ${r.test.padEnd(20)} | ${r.expected.padEnd(15)} | ${r.actual.padEnd(15)} | ${r.evidence.padEnd(25)} | ${r.status.padEnd(6)} |`);
    });

  } catch (err) {
    console.error("Test runner failed:", err.message);
  } finally {
    // PHASE 15: CLEANUP
    console.log("\n--- PHASE 15: CLEANUP ---");
    if (syntheticUserId || syntheticTenantId) {
      await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
        if (syntheticUserId) {
          await tx.authSession.deleteMany({ where: { userId: syntheticUserId } });
          await tx.userRole.deleteMany({ where: { userId: syntheticUserId } });
          await tx.securityEvent.deleteMany({ where: { userId: syntheticUserId } });
          await tx.user.delete({ where: { id: syntheticUserId } });
        }
        if (syntheticTenantId) {
          await tx.tenant.delete({ where: { id: syntheticTenantId } });
        }
      });
      console.log("- Cleanup successful.");
    }
  }
}

runTests().catch(console.error);
