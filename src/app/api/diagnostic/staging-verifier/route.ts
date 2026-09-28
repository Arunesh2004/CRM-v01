import { NextResponse } from "next/server";
import { executeAsSystem, SystemOperation } from "@db/utils/prisma-system";
import { hashPassword } from "@/lib/auth/password";
import * as crypto from "crypto";

export async function GET(request: Request) {
  // 1. Strict Staging Environment Check
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const isStagingApp = appUrl.includes("crm-v01-staging");
  const isAppEnvStaging = process.env.NEXT_PUBLIC_APP_ENV === "staging";

  // NEVER run if this is not the actual staging project 'crm-v01-staging'.
  // Vercel deployment environment can be 'production' for the staging project's main branch, so we rely on APP_URL and APP_ENV.
  if (!isStagingApp || !isAppEnvStaging) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // 2. Invocation Security Check
  const authHeader = request.headers.get("Authorization");
  const verifierSecret = process.env.STAGING_VERIFIER_SECRET;

  if (!verifierSecret || authHeader !== `Bearer ${verifierSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate unique run ID and synthetic identities
  const runId = crypto.randomUUID();
  const syntheticEmail = `test.verifier.${runId}@example.com`;
  const syntheticPassword = crypto.randomBytes(24).toString("hex") + "A1!";

  let syntheticTenantId = "";
  let syntheticUserId = "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report: any[] = [];
  function addReport(
    test: string,
    expected: string,
    actual: string,
    passed: boolean,
  ) {
    report.push({ test, expected, actual, status: passed ? "PASS" : "FAIL" });
  }

  // In-memory cookie jar for E2E
  let sessionCookie = "";

  try {
    // PHASE A: Setup Identity securely inside DB
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: `Phase 4C Verifier Tenant ${runId}`, status: "ACTIVE" },
      });
      syntheticTenantId = tenant.id;

      const passwordHash = await hashPassword(syntheticPassword);
      const user = await tx.user.create({
        data: {
          email: syntheticEmail,
          passwordHash,
          status: "ACTIVE",
          onboardingStatus: "COMPLETED",
          tenantId: tenant.id,
        },
      });
      syntheticUserId = user.id;

      const role = await tx.role.findFirst({ where: { name: "TENANT_USER" } });
      if (role) {
        await tx.userRole.create({
          data: { userId: user.id, roleId: role.id, tenantId: tenant.id },
        });
      }
    });

    // Helper for HTTP requests
    const fetchApp = async (path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      if (sessionCookie) headers.set("Cookie", sessionCookie);
      const url = new URL(path, appUrl);
      const res = await fetch(url.toString(), {
        ...options,
        headers,
        redirect: "manual",
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const match = setCookie.match(/(crm_session=[^;]+)/);
        if (match) sessionCookie = match[1];
      }
      return res;
    };

    // 1. Valid Login
    const loginRes = await fetchApp("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: appUrl },
      body: JSON.stringify({
        email: syntheticEmail,
        password: syntheticPassword,
      }),
    });

    // DB Check: Session
    const authSession = await executeAsSystem(
      SystemOperation.SECURITY_AUDIT,
      async (tx) => {
        return tx.authSession.findFirst({
          where: { userId: syntheticUserId },
          orderBy: { createdAt: "desc" },
        });
      },
    );

    const loginPassed =
      loginRes.status === 200 &&
      sessionCookie.includes("crm_session=") &&
      !!authSession;
    addReport(
      "Valid Login",
      "HTTP 200, Cookie, DB Session",
      `HTTP ${loginRes.status}, Cookie: ${!!sessionCookie}, DB: ${!!authSession}`,
      loginPassed,
    );

    if (authSession) {
      addReport(
        "Session Security",
        "Hash stored",
        "TokenHash exists",
        !!authSession.tokenHash,
      );
    }

    // 2. Authenticated Request
    const authReqRes = await fetchApp("/api/auth/me", {
      method: "GET",
      headers: { Origin: appUrl },
    });
    addReport(
      "Authenticated Request",
      "HTTP 200",
      `HTTP ${authReqRes.status}`,
      authReqRes.status === 200,
    );

    // 3. FAILED_LOGIN (Wrong Password)
    const wrongPassRes = await fetchApp("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: appUrl },
      body: JSON.stringify({
        email: syntheticEmail,
        password: "WrongPassword123!",
      }),
    });
    addReport(
      "Wrong Password",
      "HTTP 401",
      `HTTP ${wrongPassRes.status}`,
      wrongPassRes.status === 401,
    );

    // 4. Rate Limiting (Flood with FAILED_LOGIN)
    let rateLimitTriggered = false;
    for (let i = 0; i < 6; i++) {
      const rlRes = await fetchApp("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: appUrl },
        body: JSON.stringify({
          email: syntheticEmail,
          password: "WrongPassword123!",
        }),
      });
      if (rlRes.status === 429) rateLimitTriggered = true;
    }
    addReport(
      "Account Rate Limit",
      "HTTP 429",
      rateLimitTriggered ? "HTTP 429" : "No 429",
      rateLimitTriggered,
    );

    // 5. CSRF (Foreign Origin)
    const csrfForeignRes = await fetchApp("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://malicious.com",
      },
      body: JSON.stringify({
        email: syntheticEmail,
        password: syntheticPassword,
      }),
    });

    // Ensure no NEW session was created due to CSRF
    const csrfSessions = await executeAsSystem(
      SystemOperation.SECURITY_AUDIT,
      async (tx) => {
        return tx.authSession.findMany({ where: { userId: syntheticUserId } });
      },
    );
    const csrfSessionCreated = csrfSessions.length > 1; // 1 from initial login, >1 means CSRF succeeded
    addReport(
      "Foreign Origin CSRF",
      "HTTP 403, No Session",
      `HTTP ${csrfForeignRes.status}, New Session: ${csrfSessionCreated}`,
      csrfForeignRes.status === 403 && !csrfSessionCreated,
    );

    // 6. Logout
    const logoutRes = await fetchApp("/api/auth/logout", {
      method: "POST",
      headers: { Origin: appUrl },
    });
    const sessionAfterLogout = await executeAsSystem(
      SystemOperation.SECURITY_AUDIT,
      async (tx) => {
        return tx.authSession.findFirst({
          where: { userId: syntheticUserId },
          orderBy: { createdAt: "desc" },
        });
      },
    );
    const logoutPassed =
      logoutRes.status === 200 &&
      !!sessionAfterLogout &&
      sessionAfterLogout.revokedAt !== null;
    addReport(
      "Logout",
      "HTTP 200, DB Revoked",
      `HTTP ${logoutRes.status}, Revoked: ${sessionAfterLogout?.revokedAt != null}`,
      logoutPassed,
    );

    // 7. Audit Verification
    const events = await executeAsSystem(
      SystemOperation.SECURITY_AUDIT,
      async (tx) => {
        return tx.securityEvent.findMany({
          where: { userId: syntheticUserId },
        });
      },
    );

    addReport(
      "SUCCESSFUL_LOGIN Audit",
      "Event Created",
      events.some((e) => e.eventType === "SUCCESSFUL_LOGIN")
        ? "Found"
        : "Missing",
      events.some((e) => e.eventType === "SUCCESSFUL_LOGIN"),
    );
    addReport(
      "FAILED_LOGIN Audit",
      "Event Created",
      events.some((e) => e.eventType === "FAILED_LOGIN") ? "Found" : "Missing",
      events.some((e) => e.eventType === "FAILED_LOGIN"),
    );
    addReport(
      "RATE_LIMIT_TRIGGERED Audit",
      "Event Created",
      events.some((e) => e.eventType === "RATE_LIMIT_TRIGGERED")
        ? "Found"
        : "Missing",
      events.some((e) => e.eventType === "RATE_LIMIT_TRIGGERED"),
    );
    addReport(
      "LOGOUT Audit",
      "Event Created",
      events.some((e) => e.eventType === "LOGOUT") ? "Found" : "Missing",
      events.some((e) => e.eventType === "LOGOUT"),
    );
  } catch (errorRaw: unknown) {
    const error =
      errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    addReport(
      "Test Execution",
      "Complete gracefully",
      "Exception caught",
      false,
    );
    report.push({
      _error_type: error.name,
      _message_safe: error.message.replace(
        /postgresql:\/\/[^ ]+/g,
        "[REDACTED]",
      ),
    });
  } finally {
    // PHASE B: GUARANTEED CLEANUP
    let cleanupSuccess = false;
    let cleanupError = "";
    try {
      if (syntheticUserId || syntheticTenantId) {
        await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
          if (syntheticUserId) {
            await tx.authSession.deleteMany({
              where: { userId: syntheticUserId },
            });
            await tx.userRole.deleteMany({
              where: { userId: syntheticUserId },
            });
            await tx.securityEvent.deleteMany({
              where: { userId: syntheticUserId },
            });
            await tx.user.delete({ where: { id: syntheticUserId } });
          }
          if (syntheticTenantId) {
            await tx.tenant.delete({ where: { id: syntheticTenantId } });
          }
        });
        cleanupSuccess = true;
      }
    } catch (e: unknown) {
      cleanupSuccess = false;
      cleanupError = "Cleanup failed (DATA LEAK POTENTIAL)";
    }

    addReport(
      "Infrastructure Cleanup",
      "Executed",
      cleanupSuccess ? "Success" : cleanupError,
      cleanupSuccess,
    );

    // eslint-disable-next-line no-unsafe-finally
    return NextResponse.json({
      runId,
      status: report.every((r) => r.status === "PASS") ? "PASS" : "FAIL",
      report,
    });
  }
}
