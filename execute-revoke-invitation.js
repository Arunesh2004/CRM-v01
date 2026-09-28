const { Client } = require('pg');

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = "5432";
const database = "postgres";
const username = "crm_system_user.tnlrlinitgfolgwvqgyd";
const password = process.env.CRM_STAGING_SYSTEM_PASSWORD;

const companyTenantId = "ec8505e3-26ae-4ed2-9411-356475ad4c6b";
const targetEmail = "vasudevrathore126@gmail.com";
const targetId = "dacd5d46-fd66-4179-85a7-6a3f462d46b3";

async function main() {
  console.log("--- SURGICAL INVITATION REVOCATION ---");
  
  if (!password) {
    console.error("ERROR: Missing CRM_STAGING_SYSTEM_PASSWORD.");
    process.exit(1);
  }

  const encodedUser = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const databaseUrlForPg = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;

  const client = new Client({
    connectionString: databaseUrlForPg,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Perform the surgical UPDATE operation
    const updateQuery = `
      UPDATE "UserInvitation"
      SET status = 'REVOKED', "revokedAt" = NOW()
      WHERE id = $1
        AND "tenantId" = $2
        AND email = $3
        AND status = 'PENDING'
    `;
    const updateRes = await client.query(updateQuery, [targetId, companyTenantId, targetEmail]);

    console.log("- affected row count:", updateRes.rowCount);

    if (updateRes.rowCount !== 1) {
      console.error("\nWARNING: Unexpected number of rows affected. Aborting verification to preserve safety.");
      process.exit(1);
    }

    console.log("\n--- POST-UPDATE VERIFICATION ---");
    // Verify the record
    const verifyQuery = `
      SELECT id, email, "tenantId", status, "revokedAt" 
      FROM "UserInvitation" 
      WHERE id = $1
    `;
    const verifyRes = await client.query(verifyQuery, [targetId]);

    if (verifyRes.rowCount > 0) {
      const row = verifyRes.rows[0];
      console.log("- id:", row.id);
      console.log("- email:", row.email);
      console.log("- tenantId:", row.tenantId);
      console.log("- status:", row.status);
      console.log("- revokedAt:", row.revokedAt);
    } else {
      console.log("- Verified Record: NOT FOUND");
    }

  } catch (err) {
    console.error("- Error performing revocation:", err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
