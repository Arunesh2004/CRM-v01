const { Client } = require('pg');

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = process.env.CRM_STAGING_PORT || "5432";
const database = process.env.CRM_STAGING_DATABASE || "postgres";

require('dotenv').config({ path: '.env.staging.local' });
require('dotenv').config({ path: '.env.staging' });
require('dotenv').config();

const sysUsername = "crm_system_user.tnlrlinitgfolgwvqgyd";
const sysPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD || process.env.CRM_STAGING_PASSWORD || process.env.PGPASSWORD;

if (!sysPassword) {
  console.error("ERROR: Missing CRM_STAGING_SYSTEM_PASSWORD in environment.");
  process.exit(1);
}

const encodedSysUser = encodeURIComponent(sysUsername);
const encodedSysPassword = encodeURIComponent(sysPassword);
const databaseUrl = `postgresql://${encodedSysUser}:${encodedSysPassword}@${host}:${port}/${database}`;

async function verify() {
  console.log("--- SAFE POST-MIGRATION VERIFICATION ---");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    let passed = true;

    // A. Migration applied
    console.log("\nA. Checking Migration Status...");
    const migRes = await client.query(`
      SELECT finished_at 
      FROM _prisma_migrations 
      WHERE migration_name = '20260926000000_native_auth_core'
      ORDER BY started_at DESC
      LIMIT 1
    `);
    if (migRes.rowCount > 0 && migRes.rows[0].finished_at) {
      console.log("- 20260926000000_native_auth_core is successfully applied: PASS");
    } else {
      console.log("- 20260926000000_native_auth_core is successfully applied: FAIL");
      passed = false;
    }

    // B. User columns
    console.log("\nB. Checking User columns...");
    const colRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'User'
    `);
    const cols = colRes.rows.map(r => r.column_name);
    ['passwordHash', 'passwordChangedAt', 'emailVerifiedAt'].forEach(col => {
      const ok = cols.includes(col);
      console.log(`- ${col} exists:`, ok ? "PASS" : "FAIL");
      if (!ok) passed = false;
    });

    // C. New tables
    console.log("\nC. Checking New Tables...");
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    const authTables = ['AuthSession', 'AuthToken', 'MfaFactor', 'RecoveryCode'];
    authTables.forEach(tbl => {
      const ok = tables.includes(tbl);
      console.log(`- ${tbl} exists:`, ok ? "PASS" : "FAIL");
      if (!ok) passed = false;
    });

    // D. Indexes and Foreign Keys
    console.log("\nD. Checking Indexes and Foreign Keys...");
    const idxRes = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = ANY($1)
    `, [authTables]);
    console.log(`- Found ${idxRes.rowCount} indexes for the new auth tables.`);
    
    const fkRes = await client.query(`
      SELECT tc.constraint_name, tc.table_name
      FROM information_schema.table_constraints AS tc
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ANY($1)
    `, [authTables]);
    console.log(`- Found ${fkRes.rowCount} foreign keys for the new auth tables.`);
    if (idxRes.rowCount === 0 || fkRes.rowCount === 0) {
      passed = false;
      console.log("- Indexes/FKs verification: FAIL");
    } else {
      console.log("- Indexes/FKs verification: PASS");
    }

    // E. Existing data counts
    console.log("\nE. Checking Existing Data Counts...");
    const expectedCounts = { 'Tenant': 3, 'User': 1, 'Role': 4, 'UserInvitation': 2 };
    for (const [tbl, expected] of Object.entries(expectedCounts)) {
      const cRes = await client.query(`SELECT COUNT(*) FROM "${tbl}"`);
      const count = parseInt(cRes.rows[0].count, 10);
      const ok = count === expected;
      console.log(`- ${tbl} count = ${count} (expected ${expected}):`, ok ? "PASS" : "FAIL");
      if (!ok) passed = false;
    }

    // F. Existing RLS/FORCE RLS state
    console.log("\nF. Checking RLS/FORCE RLS state...");
    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname IN ('User', 'Role', 'UserInvitation', 'Subscription', 'Invoice')
    `);
    rlsRes.rows.forEach(r => {
      const ok = r.relrowsecurity === true && r.relforcerowsecurity === true;
      console.log(`- ${r.relname} RLS=${r.relrowsecurity} FORCE=${r.relforcerowsecurity}:`, ok ? "PASS" : "FAIL");
      if (!ok) passed = false;
    });

    // G. PostgreSQL role attributes
    console.log("\nG. Checking PostgreSQL role attributes...");
    const rolesRes = await client.query(`
      SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
      FROM pg_roles
      WHERE rolname IN ('crm_app_user', 'crm_system_user')
    `);
    rolesRes.rows.forEach(r => {
      if (r.rolname === 'crm_app_user') {
        const ok = !r.rolsuper && !r.rolbypassrls && !r.rolcreatedb && !r.rolcreaterole;
        console.log("- crm_app_user attributes correct (NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE):", ok ? "PASS" : "FAIL");
        if (!ok) passed = false;
      }
      if (r.rolname === 'crm_system_user') {
        const ok = !r.rolsuper && r.rolbypassrls && !r.rolcreatedb && !r.rolcreaterole;
        console.log("- crm_system_user attributes correct (NOSUPERUSER, BYPASSRLS, NOCREATEDB, NOCREATEROLE):", ok ? "PASS" : "FAIL");
        if (!ok) passed = false;
      }
    });

    // H. Canonical admin
    console.log("\nH. Checking Canonical Admin...");
    const canonicalTenantId = "ec8505e3-26ae-4ed2-9411-356475ad4c6b";
    const adminRes = await client.query(`
      SELECT status, "onboardingStatus" FROM "User"
      WHERE "tenantId" = $1 AND email = 'vasudevrathore126@gmail.com'
    `, [canonicalTenantId]);
    if (adminRes.rowCount > 0) {
      const admin = adminRes.rows[0];
      const ok = admin.status === 'INVITED' && admin.onboardingStatus === 'PENDING';
      console.log(`- Admin status=${admin.status}, onboarding=${admin.onboardingStatus}:`, ok ? "PASS" : "FAIL");
      if (!ok) passed = false;
    } else {
      console.log("- Admin user not found: FAIL");
      passed = false;
    }

    // I. Existing invitation records
    console.log("\nI. Checking Invitation Records...");
    const invRes = await client.query(`
      SELECT status FROM "UserInvitation"
      WHERE "tenantId" = $1 AND email = 'vasudevrathore126@gmail.com' AND status = 'PENDING'
    `, [canonicalTenantId]);
    if (invRes.rowCount > 0) {
      console.log("- Fresh pending invitation exists and is PENDING: PASS");
    } else {
      console.log("- Fresh pending invitation exists: FAIL");
      passed = false;
    }

    console.log("\n--- VERIFICATION RESULT ---");
    if (passed) {
      console.log("ALL CHECKS PASSED. Native-Auth schema migration successfully verified.");
    } else {
      console.log("SOME CHECKS FAILED. Please review the output above.");
      process.exitCode = 1;
    }

  } catch (err) {
    console.error("Verification script failed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

verify().catch(console.error);
