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

async function inspectPartialSchema() {
  console.log("--- SAFE PARTIAL SCHEMA DIAGNOSTIC ---");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Check User Columns
    console.log("\n1. public.User Columns:");
    const colRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'User'
    `);
    const cols = colRes.rows.map(r => r.column_name);
    ['passwordHash', 'passwordChangedAt', 'emailVerifiedAt'].forEach(col => {
      console.log(`- ${col} exists:`, cols.includes(col));
    });

    // 2. Check Tables
    console.log("\n2. New Native-Auth Tables:");
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    const authTables = ['AuthSession', 'AuthToken', 'MfaFactor', 'RecoveryCode'];
    authTables.forEach(tbl => {
      console.log(`- ${tbl} exists:`, tables.includes(tbl));
    });

    // 3. Check Indexes
    console.log("\n3. Indexes for Native-Auth Tables:");
    const idxRes = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = ANY($1)
    `, [authTables]);
    if (idxRes.rowCount > 0) {
      idxRes.rows.forEach(r => {
        console.log(`- Index ${r.indexname} exists on table ${r.tablename}`);
      });
    } else {
      console.log("- No indexes found for the new auth tables.");
    }

    // 4. Check Foreign Keys
    console.log("\n4. Foreign Key Constraints to public.User:");
    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ANY($1)
    `, [authTables]);
    if (fkRes.rowCount > 0) {
      fkRes.rows.forEach(r => {
        console.log(`- FK ${r.constraint_name} exists on table ${r.table_name}`);
      });
    } else {
      console.log("- No foreign keys found for the new auth tables.");
    }

    // 5. Data counts
    console.log("\n5. Existing Data Counts:");
    const countQueries = ['Tenant', 'User', 'Role', 'UserInvitation'];
    for (const t of countQueries) {
      try {
        const cRes = await client.query(`SELECT COUNT(*) FROM "${t}"`);
        console.log(`- ${t} count:`, cRes.rows[0].count);
      } catch (e) {
        console.log(`- ${t} count: ERROR (${e.message})`);
      }
    }

    // 6. Migration Record State
    console.log("\n6. Migration Record State:");
    const migRes = await client.query(`
      SELECT migration_name, finished_at, rolled_back_at, length(logs) as log_length
      FROM _prisma_migrations 
      WHERE migration_name = '20260926000000_native_auth_core'
    `);
    if (migRes.rowCount > 0) {
      const mig = migRes.rows[0];
      console.log("- finished_at:", mig.finished_at || 'NULL');
      console.log("- rolled_back_at:", mig.rolled_back_at || 'NULL');
      console.log("- log_length:", mig.log_length || 0);
    } else {
      console.log("- Migration record not found.");
    }

  } catch (err) {
    console.error("Diagnostic script failed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

inspectPartialSchema().catch(console.error);
