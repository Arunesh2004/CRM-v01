/**
 * Role verification script.
 * Proves which PostgreSQL role each Prisma client connects as.
 * Reads only — no writes, no schema changes.
 */
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

async function checkRole(label: string, connectionString: string | undefined) {
  if (!connectionString) {
    console.error(`[${label}] ERROR: connection string is undefined`);
    process.exit(1);
  }
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`
    SELECT current_user, session_user,
           (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) as has_bypassrls
  `);
  const row = res.rows[0];
  console.log(`[${label}]`);
  console.log(`  current_user  : ${row.current_user}`);
  console.log(`  session_user  : ${row.session_user}`);
  console.log(`  has_bypassrls : ${row.has_bypassrls}`);
  await client.end();
  return row;
}

async function main() {
  console.log('\n=== PostgreSQL Role Verification ===\n');

  const appRow = await checkRole('APPLICATION (DATABASE_URL / crm_app_user)', process.env.DATABASE_URL);
  const sysRow = await checkRole('SYSTEM (ADMIN_DATABASE_URL / crm_system_user)', process.env.ADMIN_DATABASE_URL);
  const directRow = await checkRole('DIRECT (DIRECT_URL / e2e_user)', process.env.DIRECT_URL);

  console.log('\n=== Role Assertions ===\n');

  let ok = true;

  if (appRow.current_user !== 'crm_app_user') {
    console.error(`FAIL: APPLICATION current_user is "${appRow.current_user}", expected "crm_app_user"`);
    ok = false;
  } else {
    console.log('PASS: APPLICATION current_user = crm_app_user');
  }

  if (appRow.has_bypassrls === true) {
    console.error('FAIL: APPLICATION role has BYPASSRLS — this violates the security boundary');
    ok = false;
  } else {
    console.log('PASS: APPLICATION role does NOT have BYPASSRLS (RLS is active)');
  }

  if (sysRow.current_user !== 'crm_system_user') {
    console.error(`FAIL: SYSTEM current_user is "${sysRow.current_user}", expected "crm_system_user"`);
    ok = false;
  } else {
    console.log('PASS: SYSTEM current_user = crm_system_user');
  }

  if (sysRow.has_bypassrls !== true) {
    console.error('FAIL: SYSTEM role does NOT have BYPASSRLS — this is required for system operations');
    ok = false;
  } else {
    console.log('PASS: SYSTEM role has BYPASSRLS (system bypass is active)');
  }

  console.log('\n');
  if (!ok) {
    console.error('=== ROLE VERIFICATION FAILED ===');
    process.exit(1);
  }
  console.log('=== ROLE VERIFICATION PASSED ===\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
