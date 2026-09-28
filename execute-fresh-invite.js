const { spawnSync } = require('child_process');
const { Client } = require('pg');

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = "5432";
const database = "postgres";
const username = "crm_system_user.tnlrlinitgfolgwvqgyd";
const password = process.env.CRM_STAGING_SYSTEM_PASSWORD;

const companyTenantId = "ec8505e3-26ae-4ed2-9411-356475ad4c6b";
const targetEmail = "vasudevrathore126@gmail.com";
const appUrl = "https://crm-v01-staging.vercel.app";

async function main() {
  console.log("--- FRESH INVITATION GENERATION PRE-FLIGHT ---");
  
  if (!password) {
    console.error("ERROR: Missing CRM_STAGING_SYSTEM_PASSWORD.");
    process.exit(1);
  }

  const encodedUser = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  
  const databaseUrlForPg = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  const databaseUrlForPrisma = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}?sslmode=require&pgbouncer=true`;

  const client = new Client({
    connectionString: databaseUrlForPg,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Verify tenant
    const tRes = await client.query('SELECT status FROM "Tenant" WHERE id = $1', [companyTenantId]);
    if (tRes.rowCount === 0 || tRes.rows[0].status !== 'ACTIVE') {
      console.error("ERROR: Canonical tenant is missing or not ACTIVE.");
      process.exit(1);
    }
    console.log("- canonical tenant exists and is ACTIVE: true");

    // Verify user
    const uRes = await client.query('SELECT id, email, status, "onboardingStatus", "clerkId" FROM "User" WHERE email = $1 AND "tenantId" = $2', [targetEmail, companyTenantId]);
    if (uRes.rowCount === 0) {
      console.error("ERROR: Target User does not exist.");
      process.exit(1);
    }
    const user = uRes.rows[0];
    console.log("- target User exists: true");
    console.log("- target User email matches:", user.email === targetEmail);
    console.log("- target User status is INVITED:", user.status === 'INVITED');
    console.log("- target User onboardingStatus is PENDING:", user.onboardingStatus === 'PENDING');
    console.log("- target User clerkId is NULL:", user.clerkId === null);
    
    if (user.status !== 'INVITED' || user.onboardingStatus !== 'PENDING' || user.clerkId !== null) {
      console.error("ERROR: User is not in the correct pre-activation state.");
      process.exit(1);
    }

    // Verify Role
    const rRes = await client.query(`
      SELECT 1 FROM "UserRole" ur
      JOIN "Role" r ON ur."roleId" = r.id
      WHERE ur."userId" = $1 AND r.name = 'TENANT_ADMIN'
    `, [user.id]);
    console.log("- target User has TENANT_ADMIN:", rRes.rowCount > 0);
    if (rRes.rowCount === 0) {
      console.error("ERROR: User lacks TENANT_ADMIN role.");
      process.exit(1);
    }

    // Verify no pending invitations
    const invRes = await client.query('SELECT id FROM "UserInvitation" WHERE email = $1 AND "tenantId" = $2 AND status = $3', [targetEmail, companyTenantId, 'PENDING']);
    if (invRes.rowCount > 0) {
      console.error(`ERROR: Found ${invRes.rowCount} existing PENDING invitation(s). Stopping to avoid duplicates.`);
      process.exit(1);
    }

    console.log("\nPre-flight checks passed. Generating ONE fresh invitation...\n");

    const result = spawnSync('npx.cmd', ['tsx', 'scripts/generate-bootstrap-invite.ts', targetEmail, '--role=TENANT_ADMIN'], {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrlForPrisma,
        NEXT_PUBLIC_APP_URL: appUrl,
        COMPANY_TENANT_ID: companyTenantId
      },
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: true
    });

    const sanitizeOutput = (text) => {
      if (!text) return "";
      let sanitized = text;
      sanitized = sanitized.split(password).join('[REDACTED_SYSTEM_PASSWORD]')
                           .split(encodedPassword).join('[REDACTED_SYSTEM_PASSWORD]');
      return sanitized;
    };

    if (result.stdout) {
      console.log(sanitizeOutput(result.stdout));
    }

    if (result.status !== 0 || result.error) {
      console.error("\nInvite generation failed.");
      if (result.stderr) console.error(sanitizeOutput(result.stderr));
      process.exit(1);
    }

    console.log("\n--- POST-GENERATION VERIFICATION ---");
    const newInvRes = await client.query(`
      SELECT ui.id, ui.email, ui."tenantId", r.name as role, ui.status, ui."expiresAt", ui."createdAt"
      FROM "UserInvitation" ui
      JOIN "Role" r ON ui."roleId" = r.id
      WHERE ui.email = $1 AND ui."tenantId" = $2 AND ui.status = 'PENDING'
      ORDER BY ui."createdAt" DESC LIMIT 1
    `, [targetEmail, companyTenantId]);

    if (newInvRes.rowCount > 0) {
      const row = newInvRes.rows[0];
      console.log("- invitation id:", row.id);
      console.log("- email:", row.email);
      console.log("- tenantId:", row.tenantId);
      console.log("- role:", row.role);
      console.log("- status:", row.status);
      console.log("- expiresAt:", row.expiresAt);
      console.log("- createdAt:", row.createdAt);
    } else {
      console.log("- Error: New PENDING invitation could not be verified in database.");
    }

  } catch (err) {
    console.error("- Error:", err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
