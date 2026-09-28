const { Client } = require('pg');

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = process.env.CRM_STAGING_PORT || "5432";
const database = process.env.CRM_STAGING_DATABASE || "postgres";

require('dotenv').config({ path: '.env.staging.local' });
require('dotenv').config({ path: '.env.staging' });
require('dotenv').config();

const sysUsername = "crm_system_user.tnlrlinitgfolgwvqgyd";
const sysPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD || process.env.CRM_STAGING_PASSWORD || process.env.PGPASSWORD || "Asifitsyourlast.6";

if (!sysPassword) {
  console.error("ERROR: Missing CRM_STAGING_SYSTEM_PASSWORD in environment.");
  process.exit(1);
}

const encodedSysUser = encodeURIComponent(sysUsername);
const encodedSysPassword = encodeURIComponent(sysPassword);
const pgUrl = `postgresql://${encodedSysUser}:${encodedSysPassword}@${host}:${port}/${database}`;

async function main() {
  console.log("Testing connection to:", `postgresql://${sysUsername}:[REDACTED]@${host}:${port}/${database}`);

  const client = new Client({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query("SELECT current_user, session_user;");
    console.log("Connection successful!");
    console.log("- current_user:", result.rows[0].current_user);
    console.log("- session_user:", result.rows[0].session_user);
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
