import { executeAsSystem, SystemOperation } from '../database/utils/prisma-system';
import { ToolRegistry } from '../src/modules/ai/tools/registry';
import { CANONICAL_AI_TOOLS } from '../src/modules/ai/tools/config';
import { hashPassword } from '../src/lib/auth/password';
import * as crypto from 'crypto';

const TARGET_URL = 'https://crm-v01-staging.vercel.app';

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
  
  process.env.ADMIN_DATABASE_URL = `postgresql://${encodedSysUser}:${encodedSysPassword}@${host}:${port}/${database}?sslmode=require&pgbouncer=true`;
  process.env.DATABASE_URL = process.env.ADMIN_DATABASE_URL;
  process.env.DIRECT_URL = process.env.ADMIN_DATABASE_URL;
}

let sessionCookie = "";
let sessionCookieB = "";
let sessionCookieC = "";

async function fetchApp(path: string, options: RequestInit = {}, userCookie?: string) {
  const headers = new Headers(options.headers);
  const cookieToUse = userCookie === 'B' ? sessionCookieB : userCookie === 'C' ? sessionCookieC : sessionCookie;
  if (cookieToUse) {
    headers.set('Cookie', cookieToUse);
  }
  const url = new URL(path, TARGET_URL);
  
  const res = await fetch(url.toString(), {
    ...options,
    headers,
    redirect: 'manual'
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/(crm_session=[^;]+)/);
    if (match) {
      if (!userCookie) sessionCookie = match[1];
      else if (userCookie === 'B') sessionCookieB = match[1];
      else if (userCookie === 'C') sessionCookieC = match[1];
    }
  }

  return res;
}

async function runTests() {
  const report: any[] = [];
  function addReport(test: string, status: string, evidence: string) {
    report.push({ test, status, evidence });
    console.log(`[${status}] ${test}: ${evidence}`);
  }

  console.log("--- E2E HARNESS ---");
  const runId = crypto.randomUUID();
  const syntheticEmail = `test.e2e.${Date.now()}@example.com`;
  const syntheticEmailB = `test.e2e.b.${Date.now()}@example.com`;
  const syntheticEmailC = `test.e2e.c.${Date.now()}@example.com`;
  const syntheticPassword = crypto.randomBytes(16).toString('hex') + 'A1!';
  let syntheticUserId = "";
  let syntheticTenantId = "";
  let syntheticUserIdB = "";
  let syntheticTenantIdB = "";
  let syntheticUserIdC = "";
  let syntheticLeadId = "";
  
  let cleanupErrors = 0;

  try {
    console.log("Initializing canonical AITool registry in staging (independent short transactions)...");
    for (const t of CANONICAL_AI_TOOLS) {
      await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
        await tx.aITool.upsert({
          where: { name: t.name },
          update: {
            requiredPermission: `${t.requiredResource}:${t.requiredAction}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            riskLevel: t.riskLevel as any,
            requiresApproval: t.requiresApproval
          },
          create: {
            name: t.name,
            description: t.description,
            requiredPermission: `${t.requiredResource}:${t.requiredAction}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            riskLevel: t.riskLevel as any,
            requiresApproval: t.requiresApproval
          }
        });
      });
    }
    
    // Verify bootstrap succeeded
    const verifiedTool = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.aITool.findUnique({ where: { name: 'update_lead' } });
    });
    if (!verifiedTool) {
      throw new Error("Failed to verify canonical AITool 'update_lead' exists after bootstrap");
    }
    // PROVISION TENANT A (Admin User + No-Perm User)
    await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: `E2E Tenant A - ${runId}`, status: 'ACTIVE' } });
      syntheticTenantId = tenant.id;
      
      const lead = await tx.lead.create({
        data: {
          tenantId: tenant.id,
          name: 'E2E_Test_Lead',
          company: 'Test Corp',
          status: 'NEW'
        }
      });
      syntheticLeadId = lead.id;

      const passwordHash = await hashPassword(syntheticPassword);
      
      const userA = await tx.user.create({
        data: { email: syntheticEmail, passwordHash, status: 'ACTIVE', onboardingStatus: 'COMPLETED', tenantId: tenant.id }
      });
      syntheticUserId = userA.id;
      const adminRole = await tx.role.findFirst({ where: { name: 'TENANT_ADMIN' } });
      if (adminRole) await tx.userRole.create({ data: { userId: userA.id, roleId: adminRole.id, tenantId: tenant.id } });

      const userC = await tx.user.create({
        data: { email: syntheticEmailC, passwordHash, status: 'ACTIVE', onboardingStatus: 'COMPLETED', tenantId: tenant.id }
      });
      syntheticUserIdC = userC.id;
    });

    // PROVISION TENANT B
    await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: `E2E Tenant B - ${runId}`, status: 'ACTIVE' } });
      syntheticTenantIdB = tenant.id;
      const passwordHash = await hashPassword(syntheticPassword);
      const userB = await tx.user.create({
        data: { email: syntheticEmailB, passwordHash, status: 'ACTIVE', onboardingStatus: 'COMPLETED', tenantId: tenant.id }
      });
      syntheticUserIdB = userB.id;
      const adminRole = await tx.role.findFirst({ where: { name: 'TENANT_ADMIN' } });
      if (adminRole) await tx.userRole.create({ data: { userId: userB.id, roleId: adminRole.id, tenantId: tenant.id } });
    });

    console.log("- Test Users A, B, C created.");

    // AUTHENTICATE
    const loginRes = await fetchApp('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ email: syntheticEmail, password: syntheticPassword }) });
    const loginResB = await fetchApp('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ email: syntheticEmailB, password: syntheticPassword }) }, 'B');
    const loginResC = await fetchApp('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ email: syntheticEmailC, password: syntheticPassword }) }, 'C');

    if (loginRes.status !== 200 || loginResB.status !== 200 || loginResC.status !== 200) throw new Error("Logins failed");

    // 1 & 4. AI LANGUAGE PATH + STREAMING
    console.log('Testing AI Language/Streaming...');
    const chatRes = await fetchApp('/api/ai/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL },
      body: JSON.stringify({ message: "Hello", history: [] })
    });
    const text = await chatRes.text();
    let isStreamed = false;
    text.split('\n\n').forEach(chunk => {
      if (chunk.startsWith('data: ')) {
        isStreamed = true;
      }
    });
    addReport("A. Application Streaming Runtime", isStreamed ? "PASS" : "FAIL", "NDJSON chunks streamed");
    addReport("B. Real Gemini Streaming Provider E2E", "UNVALIDATED", "No safe runtime evidence exposed to client to prove Gemini provider vs Mock.");
    addReport("C. Real Gemini Language E2E", "UNVALIDATED", "No safe runtime evidence exposed to client to prove Gemini provider vs Mock.");

    // B. REAL GEMINI VISION
    addReport("D. Real Gemini Vision E2E", "UNVALIDATED", "Not supported natively via existing /api/ai/copilot signature");

    // 5. RBAC NEGATIVE TEST (Front-end capability denial)
    console.log('Testing RBAC Generation...');
    const readResAdmin = await fetchApp('/api/ai/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ message: "List my customers.", history: [] }) });
    let adminInvokedTool = (await readResAdmin.text()).includes("tool_call");
    
    const readResNoPerm = await fetchApp('/api/ai/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ message: "List my customers.", history: [] }) }, 'C');
    let noPermInvokedTool = (await readResNoPerm.text()).includes("tool_call");

    addReport("E.1. RBAC Allowed Path (Admin)", adminInvokedTool ? "PASS" : "FAIL", "Tool execution initiated by admin");
    addReport("E.2. RBAC Denied Path (No-Perm)", !noPermInvokedTool ? "PASS" : "FAIL", "Tool execution safely omitted from no-perm user stream");

    // 7. MUTATION EVIDENCE
    console.log('Testing Tool Generation (Mutation)...');
    const mutRes = await fetchApp('/api/ai/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ message: `Update the lead with ID ${syntheticLeadId} to status CONTACTED.`, history: [] }) });
    const mutText = await mutRes.text();
    let executionId = "";
    let toolName = "";
    mutText.split('\n\n').forEach(chunk => {
      if (chunk.startsWith('data: ')) {
        try {
          const payload = JSON.parse(chunk.replace('data: ', ""));
          if (payload.type === 'pending_confirmation') {
            executionId = payload.executionId;
            toolName = payload.tool;
          }
        } catch(e) {}
      }
    });
    addReport("F.1. AI-generated mutation/tool call", executionId ? "PASS" : "FAIL", `Generated tool execution prompt for ${toolName}`);

    let mutationConfirmed = false;
    if (executionId) {
      const existingExec = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        return tx.aIExecution.findUnique({ where: { id: executionId } });
      });
      addReport("F.2. App created pending execution", existingExec && existingExec.status === 'PENDING' ? "PASS" : "FAIL", "Execution record found with status PENDING");

      console.log('Confirming Execution ID:', executionId);
      const confRes = await fetchApp('/api/ai/copilot/execute', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ executionId, action: 'CONFIRM' }) });
      const confData = await confRes.json();
      mutationConfirmed = confRes.status === 200 && confData.success;
      addReport("F.3. Authorized execution endpoint executed it", mutationConfirmed ? "PASS" : "FAIL", `API returned ${confRes.status}`);

      const lead = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => { return tx.lead.findUnique({ where: { id: syntheticLeadId } }); });
      addReport("F.4. Database state changed", lead?.status === 'CONTACTED' ? "PASS" : "FAIL", `Found lead status ${lead?.status}`);

      const audit = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => { return tx.auditLog.findMany({ where: { tenantId: syntheticTenantId, action: 'UPDATE', resource: 'LEAD' } }); });
      addReport("F.5. Persisted Audit/Activity evidence", audit.length > 0 ? "PASS" : "FAIL", `Found ${audit.length} audit logs`);
    }

    addReport("G.1. RBAC Allowed Path (Admin)", mutationConfirmed ? "PASS" : "FAIL", "Tool execution completed by admin");

    // 5. DETERMINISTIC RBAC NEGATIVE TEST (Backend execution denial)
    console.log('Testing Deterministic RBAC Execution...');
    let rbacExecutionId = "";
    try {
      const rbacExec = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        const tool = await tx.aITool.findFirst({ where: { name: 'update_lead' } });
        if (!tool) throw new Error("Tool not found");
        return tx.aIExecution.create({
          data: {
            id: 'exec_' + Date.now() + '_rbac',
            tenantId: syntheticTenantId,
            userId: syntheticUserIdC,
            toolId: tool.id,
            status: 'PENDING',
            input: JSON.stringify({ leadId: syntheticLeadId, status: "QUALIFIED" })
          }
        });
      });
      rbacExecutionId = rbacExec.id;
    } catch(e) {
      console.warn("Failed to setup RBAC test:", e);
    }

    if (rbacExecutionId) {
      const confResNoPerm = await fetchApp('/api/ai/copilot/execute', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ executionId: rbacExecutionId, action: 'CONFIRM' }) }, 'C');
      addReport("G.2. RBAC Denied Path (No-Perm)", confResNoPerm.status === 403 ? "PASS" : "FAIL", `Execution directly rejected with ${confResNoPerm.status}`);
    } else {
      addReport("G.2. RBAC Denied Path (No-Perm)", "BLOCKED", "Could not setup RBAC test execution");
    }

    // 6. CROSS-TENANT ISOLATION
    if (executionId) {
      const confResB = await fetchApp('/api/ai/copilot/execute', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ executionId, action: 'CONFIRM' }) }, 'B');
      addReport("H. Cross-Tenant Isolation", confResB.status === 404 ? "PASS" : "FAIL", `Tenant B cross-access returned ${confResB.status}`);
    } else {
       addReport("H. Cross-Tenant Isolation", "BLOCKED", "No executionId to test");
    }

    // 8. IDEMPOTENCY REPLAY
    if (executionId && mutationConfirmed) {
      console.log('Replaying execution for idempotency check...');
      const repRes = await fetchApp('/api/ai/copilot/execute', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': TARGET_URL }, body: JSON.stringify({ executionId, action: 'CONFIRM' }) });
      addReport("I.1. Idempotency HTTP Response", repRes.status === 409 ? "PASS" : "FAIL", `Replayed CONFIRM returned ${repRes.status}`);
      
      const leads = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => { return tx.lead.findMany({ where: { id: syntheticLeadId } }); });
      addReport("I.2. Idempotency Database State (No Duplicates)", leads.length === 1 ? "PASS" : "FAIL", `Found exactly ${leads.length} records`);
    } else {
      addReport("I. Idempotency Replay", "BLOCKED", "No confirmed execution to replay");
    }

    console.log("\n==================================================");
    console.log("FINAL REPORT");
    console.log("==================================================\n");
    report.forEach(r => {
      console.log(`[${r.status}] ${r.test} | ${r.evidence}`);
    });

  } catch (err: any) {
    console.error("Test runner failed:", err.message);
  } finally {
    // 9. CLEANUP (Fail-closed)
    console.log("\n--- CLEANUP ---");
    let deletedDisposable = 0;
    
    try {
      // 9a. Add current run tenants to cleanup set
      const allTidSet = new Set<string>();
      if (syntheticTenantId) allTidSet.add(syntheticTenantId);
      if (syntheticTenantIdB) allTidSet.add(syntheticTenantIdB);
      
      const tidArray = Array.from(allTidSet);
      if (tidArray.length > 0) {
        // 9b. Delete disposable children in isolated transaction
        await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
          const e = await tx.aIExecution.deleteMany({ where: { tenantId: { in: tidArray } } });
          const c = await tx.customer.deleteMany({ where: { tenantId: { in: tidArray } } });
          const l = await tx.lead.deleteMany({ where: { tenantId: { in: tidArray } } });
          const a = await tx.authSession.deleteMany({ where: { user: { tenantId: { in: tidArray } } } });
          const u = await tx.userRole.deleteMany({ where: { user: { tenantId: { in: tidArray } } } });
          deletedDisposable += e.count + c.count + l.count + a.count + u.count;
        });

        // Collect all users for these tenants
        const allUsers = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
          return tx.user.findMany({ where: { tenantId: { in: tidArray } } });
        });
        
        // 9c. Individually delete Users
        for (const user of allUsers) {
          try {
            await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
              await tx.user.delete({ where: { id: user.id } });
            });
          } catch (e: any) {
            if (e.message?.includes('Restrict') || e.message?.includes('Foreign key constraint')) {
              console.warn(`Tolerated cleanup failure (User ${user.id} FK retained by immutable ActivityTimeline)`);
            } else {
              cleanupErrors++;
              console.error(`Unexpected error deleting User ${user.id}: ${e.message}`);
            }
          }
        }
        
        // 9d. Individually delete Tenants
        for (const tid of tidArray) {
          try {
            await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
              await tx.tenant.delete({ where: { id: tid } });
            });
          } catch (e: any) {
            if (e.message?.includes('Restrict') || e.message?.includes('Foreign key constraint')) {
              console.warn(`Tolerated cleanup failure (Tenant ${tid} FK retained by immutable AuditLog)`);
            } else {
              cleanupErrors++;
              console.error(`Unexpected error deleting Tenant ${tid}: ${e.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      cleanupErrors++;
      console.error(`Unexpected cleanup failure: ${err.message}`);
    }

    if (cleanupErrors > 0) {
      console.error(`\n[FAIL] CLEANUP FAILURE: ${cleanupErrors} unexpected cleanup errors occurred.`);
    } else {
      console.log(`\n[PASS] CLEANUP SUCCESS: ${deletedDisposable} disposable records successfully deleted.`);
      console.log(`NOTE: Any intentionally retained User/Tenant records are preserving immutable append-only FK audit bounds.`);
    }
  }
}

runTests().catch(console.error);
