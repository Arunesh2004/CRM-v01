const { Client } = require("pg");

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = "5432";
const database = "postgres";
const username = "postgres.tnlrlinitgfolgwvqgyd";

// Attempt to resolve the postgres password from likely existing local environment variables
const password = process.env.CRM_STAGING_POSTGRES_PASSWORD || process.env.CRM_STAGING_PASSWORD || process.env.PGPASSWORD;

async function main() {
  console.log("POSTGRES POOLER CONNECTION:");
  console.log("- host:", host);
  console.log("- port:", port);
  console.log("- database:", database);
  console.log("- username:", username);
  
  if (!password) {
    console.log("- error: Password environment variable not found.");
    return;
  }

  const encodedUser = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  
  // Omit ?sslmode=require to avoid overriding local explicit pg ssl options
  const connectionString = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const result = await client.query("SELECT current_user, session_user;");
    const { current_user, session_user } = result.rows[0];

    console.log("- connection successful: true");
    console.log("- current_user:", current_user);
    console.log("- session_user:", session_user);
  } catch (error) {
    console.log("- connection successful: false");
    console.log("- safe error message:", error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch(err => {
  console.error("- Fatal Error:", err.message);
  process.exitCode = 1;
});
