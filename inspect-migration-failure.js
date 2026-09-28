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

async function inspect() {
  console.log("--- SAFE MIGRATION FAILURE DIAGNOSTIC ---");

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Connection identity
    console.log("\n1. Connection Identity:");
    const idRes = await client.query("SELECT current_user, session_user;");
    console.log("- current_user:", idRes.rows[0].current_user);
    console.log("- session_user:", idRes.rows[0].session_user);

    // 2. Table Ownership Map
    console.log("\n2. Table Ownership Map:");
    const tables = ['User', 'Tenant', 'Role', 'UserInvitation', '_prisma_migrations'];
    const ownerRes = await client.query(`
      SELECT tablename, tableowner 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = ANY($1)
    `, [tables]);
    
    ownerRes.rows.forEach(r => {
      console.log(`- ${r.tablename}: owner is ${r.tableowner}`);
    });

    // 3. Failed Migration State
    console.log("\n3. Failed Migration State:");
    const migRes = await client.query(`
      SELECT migration_name, finished_at, rolled_back_at, length(logs) as log_length
      FROM _prisma_migrations 
      WHERE migration_name = '20260926000000_native_auth_core'
    `);
    
    if (migRes.rowCount > 0) {
      const mig = migRes.rows[0];
      console.log("- migration_name:", mig.migration_name);
      console.log("- finished_at:", mig.finished_at);
      console.log("- rolled_back_at:", mig.rolled_back_at);
      console.log("- log_length:", mig.log_length || 0);
    } else {
      console.log("- 20260926000000_native_auth_core not found in _prisma_migrations.");
    }

  } catch (err) {
    console.error("Diagnostic script failed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

inspect().catch(console.error);
