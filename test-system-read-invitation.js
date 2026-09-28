const { Client } = require('pg');

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = "5432";
const database = "postgres";
const username = "crm_system_user.tnlrlinitgfolgwvqgyd";
const password = process.env.CRM_STAGING_SYSTEM_PASSWORD;

const companyTenantId = process.env.COMPANY_TENANT_ID;
const targetEmail = "vasudevrathore126@gmail.com";

async function main() {
  console.log("--- READ-ONLY INVITATION DIAGNOSTIC ---");
  
  if (!password) {
    console.error("ERROR: Missing CRM_STAGING_SYSTEM_PASSWORD.");
    process.exit(1);
  }
  if (!companyTenantId) {
    console.error("ERROR: Missing COMPANY_TENANT_ID.");
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

    const query = `
      SELECT id, email, "tenantId", status, "expiresAt", "revokedAt", "createdAt" 
      FROM "UserInvitation" 
      WHERE email = $1 AND "tenantId" = $2
    `;
    const res = await client.query(query, [targetEmail, companyTenantId]);

    if (res.rowCount === 0) {
      console.log("No UserInvitation found for this email and tenant.");
    } else {
      res.rows.forEach(row => {
        console.log("- id:", row.id);
        console.log("- email:", row.email);
        console.log("- tenantId:", row.tenantId);
        console.log("- status:", row.status);
        console.log("- expiresAt:", row.expiresAt);
        console.log("- revokedAt:", row.revokedAt);
        console.log("- createdAt:", row.createdAt);
        console.log("-------------------------");
      });
    }

  } catch (err) {
    console.error("- Error querying database:", err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
