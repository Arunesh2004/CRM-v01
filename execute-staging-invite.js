const { spawnSync } = require('child_process');

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = "5432";
const database = "postgres";
const username = "crm_system_user.tnlrlinitgfolgwvqgyd";
const password = process.env.CRM_STAGING_SYSTEM_PASSWORD;

const companyTenantId = process.env.COMPANY_TENANT_ID;
const requiredTenantId = "ec8505e3-26ae-4ed2-9411-356475ad4c6b";
const targetEmail = "vasudevrathore126@gmail.com";
const appUrl = "https://crm-v01-staging.vercel.app";

async function main() {
  console.log("--- STAGING BOOTSTRAP INVITATION PRE-FLIGHT ---");
  console.log("- target: staging");
  console.log(`- tenant ID: ${requiredTenantId}`);
  console.log(`- administrator email: ${targetEmail}`);
  console.log(`- database host: ${host}`);
  console.log("- database user: crm_system_user");
  console.log(`- password present: ${!!password}`);
  console.log(`- app URL: ${appUrl}`);

  if (!password) {
    console.error("\nERROR: Missing CRM_STAGING_SYSTEM_PASSWORD in environment.");
    process.exit(1);
  }
  
  if (!companyTenantId) {
    console.error("\nERROR: Missing COMPANY_TENANT_ID in environment.");
    process.exit(1);
  }

  if (companyTenantId !== requiredTenantId) {
    console.error(`\nERROR: COMPANY_TENANT_ID mismatch.`);
    console.error(`Expected: ${requiredTenantId}`);
    console.error(`Found:    ${companyTenantId}`);
    console.error("Stopping execution.");
    process.exit(1);
  }

  const encodedUser = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  
  // Construct the privileged Prisma connection url with pgbouncer=true
  const databaseUrlForPrisma = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}?sslmode=require&pgbouncer=true`;

  console.log("\nExecuting: npx tsx scripts/generate-bootstrap-invite.ts...");

  // Execute the underlying invite generation script
  const result = spawnSync('npx.cmd', ['tsx', 'scripts/generate-bootstrap-invite.ts', targetEmail], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrlForPrisma,
      NEXT_PUBLIC_APP_URL: appUrl
    },
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: true
  });

  const sanitizeOutput = (text) => {
    if (!text) return "";
    let sanitized = text;
    if (password) {
      sanitized = sanitized.split(password).join('[REDACTED_SYSTEM_PASSWORD]')
                           .split(encodedPassword).join('[REDACTED_SYSTEM_PASSWORD]');
    }
    return sanitized;
  };

  if (result.stdout) {
    console.log(sanitizeOutput(result.stdout));
  }

  if (result.status !== 0 || result.error) {
    console.error("\nInvite generation failed. Stopping.");
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
}

main().catch(console.error);
