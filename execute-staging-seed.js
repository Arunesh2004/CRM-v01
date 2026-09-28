const { spawnSync } = require('child_process');
const { Client } = require('pg');

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = process.env.CRM_STAGING_PORT || "5432";
const database = process.env.CRM_STAGING_DATABASE || "postgres";

const appUsername = "crm_app_user.tnlrlinitgfolgwvqgyd";
const appPassword = process.env.CRM_STAGING_APP_PASSWORD;

const sysUsername = "crm_system_user.tnlrlinitgfolgwvqgyd";
const sysPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD;

const companyTenantId = process.env.COMPANY_TENANT_ID;
const initialAdminEmailRaw = process.env.INITIAL_ADMIN_EMAIL;

async function main() {
  console.log("--- STAGING SEED PRE-FLIGHT CHECK ---");
  
  if (!appPassword) {
    console.error("ERROR: Missing CRM_STAGING_APP_PASSWORD in environment.");
    process.exit(1);
  }
  if (!sysPassword) {
    console.error("ERROR: Missing CRM_STAGING_SYSTEM_PASSWORD in environment.");
    process.exit(1);
  }
  if (!companyTenantId) {
    console.error("ERROR: Missing COMPANY_TENANT_ID in environment.");
    process.exit(1);
  }
  if (!initialAdminEmailRaw) {
    console.error("ERROR: Missing INITIAL_ADMIN_EMAIL in environment.");
    process.exit(1);
  }

  const initialAdminEmails = initialAdminEmailRaw.split(',').map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
  const firstAdminEmail = initialAdminEmails[0];

  const encodedSysUser = encodeURIComponent(sysUsername);
  const encodedSysPassword = encodeURIComponent(sysPassword);
  
  // Need to pass ?sslmode=require and pgbouncer=true for Prisma
  const databaseUrlForPrisma = `postgresql://${encodedSysUser}:${encodedSysPassword}@${host}:${port}/${database}?sslmode=require&pgbouncer=true`;
  
  // For the node pg verification step (read-only verification of results via the bypass system connection)
  const databaseUrlForPg = `postgresql://${encodedSysUser}:${encodedSysPassword}@${host}:${port}/${database}`;

  console.log("Required variables present.");
  
  // SAFE metadata diagnostic before executing the seed
  console.log("\n--- STAGING SEED CONNECTION METADATA ---");
  console.log("- database host:", host);
  console.log("- database name:", database);
  console.log("- username: crm_system_user");
  console.log("- password present: true");
  console.log("- target: staging");

  console.log("\nExecuting: npx prisma db seed...");

  // Execute Prisma Seed
  const result = spawnSync('npx.cmd', ['prisma', 'db', 'seed'], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrlForPrisma
    },
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: true
  });

  const sanitizeOutput = (text) => {
    if (!text) return "";
    let sanitized = text;
    if (appPassword) {
      sanitized = sanitized.split(appPassword).join('[REDACTED_APP_PASSWORD]')
                           .split(encodeURIComponent(appPassword)).join('[REDACTED_APP_PASSWORD]');
    }
    if (sysPassword) {
      sanitized = sanitized.split(sysPassword).join('[REDACTED_SYSTEM_PASSWORD]')
                           .split(encodeURIComponent(sysPassword)).join('[REDACTED_SYSTEM_PASSWORD]');
    }
    return sanitized;
  };

  if (result.stdout) {
    console.log(sanitizeOutput(result.stdout));
  }

  if (result.status !== 0 || result.error) {
    console.error("\nSeed failed. Stopping.");
    console.error(`Exit Code: ${result.status}`);
    if (result.error) {
      console.error(`Spawn Error: ${result.error.message}`);
    }
    if (result.stderr) {
      console.error("\n--- ERROR OUTPUT ---");
      console.error(sanitizeOutput(result.stderr));
    }
    process.exit(1);
  }

  console.log("\n--- SEED COMPLETE. BEGINNING READ-ONLY VERIFICATION ---\n");

  const client = new Client({
    connectionString: databaseUrlForPg,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Canonical Tenant Exists
    const tenantRes = await client.query('SELECT id, status, name FROM "Tenant" WHERE id = $1', [companyTenantId]);
    console.log("1. Canonical Tenant exists:", tenantRes.rowCount > 0 ? `YES (${tenantRes.rows[0].status})` : 'NO');

    // 2-6. Expected Initial Admin User
    const userRes = await client.query('SELECT id, email, status, "onboardingStatus", "clerkId" FROM "User" WHERE email = $1 AND "tenantId" = $2', [firstAdminEmail, companyTenantId]);
    if (userRes.rowCount > 0) {
      const u = userRes.rows[0];
      console.log("2. Expected initial admin User exists: YES");
      console.log("3. Initial admin status:", u.status);
      console.log("4. Initial admin onboardingStatus:", u.onboardingStatus);
      console.log("5. Initial admin email:", u.email);
      console.log("6. Initial admin clerkId state:", u.clerkId === null ? 'NULL' : 'SET');
      
      // 7-8. UserRole and TENANT_ADMIN role
      const roleRes = await client.query(`
        SELECT r.name, r.id as "roleId" 
        FROM "UserRole" ur 
        JOIN "Role" r ON ur."roleId" = r.id 
        WHERE ur."userId" = $1 AND r.name = 'TENANT_ADMIN'
      `, [u.id]);
      console.log("7. UserRole exists for admin:", roleRes.rowCount > 0 ? 'YES' : 'NO');
      console.log("8. TENANT_ADMIN role exists:", roleRes.rowCount > 0 ? 'YES' : 'NO');

      // 9. RolePermission records
      if (roleRes.rowCount > 0) {
        const rpRes = await client.query('SELECT count(*) FROM "RolePermission" WHERE "roleId" = $1', [roleRes.rows[0].roleId]);
        console.log("9. Expected RolePermission records exist:", rpRes.rows[0].count > 0 ? `YES (${rpRes.rows[0].count} records)` : 'NO');
      } else {
        console.log("9. Expected RolePermission records exist: N/A (Role missing)");
      }
    } else {
      console.log("2. Expected initial admin User exists: NO");
      console.log("3-9: SKIPPED");
    }

    // 10-12. UserInvitation
    const invRes = await client.query('SELECT status, "expiresAt" FROM "UserInvitation" WHERE email = $1 AND "tenantId" = $2', [firstAdminEmail, companyTenantId]);
    if (invRes.rowCount > 0) {
      console.log("10. UserInvitation exists:", "YES");
      console.log("11. Invitation status:", invRes.rows[0].status);
      console.log("12. Invitation expiry metadata:", invRes.rows[0].expiresAt);
    } else {
      console.log("10. UserInvitation exists:", "NO (Seed script does not appear to create UserInvitation rows)");
    }

    // 13. Synthetic RLS-test tenants remain unchanged
    const rlsTenantsRes = await client.query(`
      SELECT id FROM "Tenant" 
      WHERE id IN ('598be080-d215-4885-ae1b-af839e5f6f91', '66155cec-5d53-46dc-a955-ffd5805d4d74')
    `);
    console.log("13. Synthetic RLS-test tenants present:", rlsTenantsRes.rowCount === 2 ? 'YES (both present)' : `NO (found ${rlsTenantsRes.rowCount})`);

    // 14. Total User / Tenant count
    const totalT = await client.query('SELECT count(*) FROM "Tenant"');
    const totalU = await client.query('SELECT count(*) FROM "User"');
    console.log("14. Total Tenant count:", totalT.rows[0].count);
    console.log("    Total User count:", totalU.rows[0].count);

  } catch (err) {
    console.error("\nREAD-ONLY VERIFICATION FAILED:", err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
