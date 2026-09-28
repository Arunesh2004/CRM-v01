const { Client } = require("pg");

const tenantA = "598be080-d215-4885-ae1b-af839e5f6f91";
const tenantB = "66155cec-5d53-46dc-a955-ffd5805d4d74";

const client = new Client({
  host: process.env.CRM_STAGING_HOST,
  port: Number(process.env.CRM_STAGING_PORT),
  database: process.env.CRM_STAGING_DATABASE,
  user: "crm_system_user",
  password: process.env.CRM_STAGING_SYSTEM_PASSWORD,
  ssl: false,
});

async function main() {
  await client.connect();

  const contextResult = await client.query(`
    SELECT
      current_user as current_user,
      session_user as session_user,
      current_setting('app.current_tenant_id', true) AS tenant_context,
      current_setting('app.bypass_rls', true) AS bypass_context,
      (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) as rolsuper,
      (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) as rolbypassrls
  `);

  const subResult = await client.query(`
    SELECT
      "tenantId",
      "status"
    FROM "Subscription"
    ORDER BY "tenantId"
  `);

  const context = contextResult.rows[0];
  const rows = subResult.rows;

  let failedCondition = null;

  if (context.current_user !== "crm_system_user") {
    failedCondition = "current_user must equal crm_system_user (Actual: " + context.current_user + ")";
  } else if (context.session_user !== "crm_system_user") {
    failedCondition = "session_user must equal crm_system_user (Actual: " + context.session_user + ")";
  } else if (context.rolsuper !== false) {
    failedCondition = "rolsuper must be false (Actual: " + context.rolsuper + ")";
  } else if (context.rolbypassrls !== true) {
    failedCondition = "rolbypassrls must be true (Actual: " + context.rolbypassrls + ")";
  } else if (context.bypass_context !== null && context.bypass_context !== "") {
    failedCondition = "app.bypass_rls must be null/empty/unset (Actual: " + context.bypass_context + ")";
  } else if (rows.length !== 2) {
    failedCondition = "Exactly TWO Subscription rows must be visible (Actual count: " + rows.length + ")";
  } else if (!rows.some(r => r.tenantId === tenantA)) {
    failedCondition = "Tenant A UUID must be present";
  } else if (!rows.some(r => r.tenantId === tenantB)) {
    failedCondition = "Tenant B UUID must be present";
  } else if (!rows.some(r => r.status === "RLS_TEST_A")) {
    failedCondition = "Tenant A status (RLS_TEST_A) must be present";
  } else if (!rows.some(r => r.status === "RLS_TEST_B")) {
    failedCondition = "Tenant B status (RLS_TEST_B) must be present";
  }

  if (failedCondition) {
    console.log("SYSTEM-ROLE RLS VISIBILITY TEST: FAIL");
    console.log("Failed condition: " + failedCondition);
  } else {
    console.log("SYSTEM-ROLE RLS VISIBILITY TEST: PASS");
  }

  console.log("current_user:", context.current_user);
  console.log("session_user:", context.session_user);
  console.log("rolsuper:", context.rolsuper);
  console.log("rolbypassrls:", context.rolbypassrls);
  console.log("bypass_context:", context.bypass_context);
  console.log("visible row count:", rows.length);
  console.log("visible tenantId(s):", rows.map(r => r.tenantId).join(", "));
  console.log("visible status(es):", rows.map(r => r.status).join(", "));
}

main()
  .catch((error) => {
    console.error("Error:", error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
