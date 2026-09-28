const { spawnSync } = require('child_process');
const { Client } = require('pg');
const { URL } = require('url');

require('dotenv').config({ path: '.env.staging.local' });
require('dotenv').config({ path: '.env.staging' });
require('dotenv').config();

const directUrlString = process.env.DIRECT_URL;

if (!directUrlString) {
  console.error("ERROR: Missing DIRECT_URL in environment.");
  process.exit(1);
}

const parsedUrl = new URL(directUrlString);

async function main() {
  console.log("--- PHASE A: PREFLIGHT VERIFICATION ---");
  console.log("- Host:", parsedUrl.hostname);
  console.log("- Database:", parsedUrl.pathname.slice(1));
  console.log("- Username:", parsedUrl.username);

  const client = new Client({
    connectionString: directUrlString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Identity Check
    const idRes = await client.query("SELECT current_user, session_user;");
    const { current_user, session_user } = idRes.rows[0];
    console.log(`- current_user: ${current_user}, session_user: ${session_user}`);
    if (current_user !== 'postgres' || session_user !== 'postgres') {
      console.error("ERROR: Not connected as postgres. Halting.");
      process.exit(1);
    }

    // Latest Migration State Check
    const migRes = await client.query(`SELECT migration_name FROM _prisma_migrations ORDER BY started_at DESC LIMIT 1`);
    if (migRes.rowCount > 0) {
      console.log(`- Latest migration: ${migRes.rows[0].migration_name}`);
    }

    // Existing native-auth schema check
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('AuthSession', 'AuthToken', 'MfaFactor', 'RecoveryCode')
    `);
    console.log(`- Native Auth Tables Present: ${tablesRes.rowCount === 4}`);
    if (tablesRes.rowCount !== 4) {
      console.error("ERROR: Missing Phase 3 native auth tables. Halting.");
      process.exit(1);
    }

    // Check Enums before
    const typeEnumRes = await client.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'SecurityEventType'`);
    console.log("- Current SecurityEventType values:", typeEnumRes.rows.map(r => r.enumlabel).join(', '));
    const sevEnumRes = await client.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'SecurityEventSeverity'`);
    console.log("- Current SecurityEventSeverity values:", sevEnumRes.rows.map(r => r.enumlabel).join(', '));

  } catch (err) {
    console.error("Preflight failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log("\n--- PHASE B: APPLY MIGRATION ---");
  const envOverrides = {
    ...process.env,
    DATABASE_URL: directUrlString,
    DIRECT_URL: directUrlString
  };
  
  const deployResult = spawnSync('npx.cmd', ['prisma', 'migrate', 'deploy'], {
    env: envOverrides,
    encoding: 'utf-8',
    stdio: 'inherit',
    shell: true
  });

  if (deployResult.status !== 0 || deployResult.error) {
    console.error("\nMigration deployment failed. Halting.");
    process.exit(1);
  }

  console.log("\n--- PHASE C: POST-MIGRATION VERIFICATION ---");
  
  const verifyClient = new Client({
    connectionString: directUrlString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await verifyClient.connect();
    let passed = true;

    // 1. Migration Bookkeeping
    const migCheck = await verifyClient.query(`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      WHERE migration_name = '20260926000001_auth_audit_events'
    `);
    if (migCheck.rowCount > 0 && migCheck.rows[0].finished_at) {
      console.log("- Migration 20260926000001_auth_audit_events successfully applied: PASS");
    } else {
      console.log("- Migration 20260926000001_auth_audit_events applied: FAIL");
      passed = false;
    }

    // 2. Enum Verification
    const newTypesRes = await verifyClient.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'SecurityEventType'`);
    const newTypes = newTypesRes.rows.map(r => r.enumlabel);
    ['SUCCESSFUL_LOGIN', 'LOGOUT', 'SESSION_REVOKED', 'PASSWORD_CHANGED'].forEach(val => {
      const ok = newTypes.includes(val);
      console.log(`- SecurityEventType includes ${val}: ${ok ? "PASS" : "FAIL"}`);
      if (!ok) passed = false;
    });

    const newSevRes = await verifyClient.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'SecurityEventSeverity'`);
    const newSevs = newSevRes.rows.map(r => r.enumlabel);
    const hasInfo = newSevs.includes('INFO');
    console.log(`- SecurityEventSeverity includes INFO: ${hasInfo ? "PASS" : "FAIL"}`);
    if (!hasInfo) passed = false;

    // 3. Schema Intact Verification
    const intactRes = await verifyClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('AuthSession', 'AuthToken', 'MfaFactor', 'RecoveryCode')
    `);
    console.log(`- Native Auth Tables Intact: ${intactRes.rowCount === 4 ? "PASS" : "FAIL"}`);
    if (intactRes.rowCount !== 4) passed = false;

    const userColRes = await verifyClient.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User'`);
    const uCols = userColRes.rows.map(r => r.column_name);
    ['passwordHash', 'passwordChangedAt', 'emailVerifiedAt'].forEach(col => {
      const ok = uCols.includes(col);
      console.log(`- User.${col} exists: ${ok ? "PASS" : "FAIL"}`);
      if (!ok) passed = false;
    });

    // 4. Security Boundary Regression Check
    const rlsRes = await verifyClient.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname IN ('User', 'Role', 'UserInvitation', 'Subscription', 'Invoice')
    `);
    rlsRes.rows.forEach(r => {
      const ok = r.relrowsecurity === true && r.relforcerowsecurity === true;
      console.log(`- ${r.relname} RLS=${r.relrowsecurity} FORCE=${r.relforcerowsecurity}: ${ok ? "PASS" : "FAIL"}`);
      if (!ok) passed = false;
    });

    const rolesRes = await verifyClient.query(`
      SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
      FROM pg_roles
      WHERE rolname IN ('crm_app_user', 'crm_system_user')
    `);
    rolesRes.rows.forEach(r => {
      if (r.rolname === 'crm_app_user') {
        const ok = !r.rolsuper && !r.rolbypassrls && !r.rolcreatedb && !r.rolcreaterole;
        console.log(`- crm_app_user attributes correct: ${ok ? "PASS" : "FAIL"}`);
        if (!ok) passed = false;
      }
      if (r.rolname === 'crm_system_user') {
        const ok = !r.rolsuper && r.rolbypassrls && !r.rolcreatedb && !r.rolcreaterole;
        console.log(`- crm_system_user attributes correct: ${ok ? "PASS" : "FAIL"}`);
        if (!ok) passed = false;
      }
    });

    console.log("\n--- VERIFICATION RESULT ---");
    if (passed) {
      console.log("ALL CHECKS PASSED. Migration and Security Boundary successfully verified.");
    } else {
      console.log("SOME CHECKS FAILED. Please review the output above.");
      process.exit(1);
    }

  } catch (err) {
    console.error("Verification failed:", err.message);
    process.exit(1);
  } finally {
    await verifyClient.end();
  }
}

main().catch(console.error);
