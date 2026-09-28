const { Client } = require("pg");

const tenantA = "598be080-d215-4885-ae1b-af839e5f6f91";
const tenantB = "66155cec-5d53-46dc-a955-ffd5805d4d74";

const client = new Client({
  host: process.env.CRM_STAGING_HOST,
  port: Number(process.env.CRM_STAGING_PORT),
  database: process.env.CRM_STAGING_DATABASE,
  user: "crm_app_user",
  password: process.env.CRM_STAGING_APP_PASSWORD,
  ssl: false,
});

async function main() {
  await client.connect();

  await client.query(
    `SELECT set_config('app.current_tenant_id', $1, false)`,
    [tenantB]
  );

  const contextResult = await client.query(`
    SELECT
      current_user as current_user,
      session_user as session_user,
      current_setting('app.current_tenant_id', true) AS tenant_context,
      current_setting('app.bypass_rls', true) AS bypass_context
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

  if (context.current_user !== "crm_app_user") {
    failedCondition = "current_user must equal crm_app_user (Actual: " + context.current_user + ")";
  } else if (context.session_user !== "crm_app_user") {
    failedCondition = "session_user must equal crm_app_user (Actual: " + context.session_user + ")";
  } else if (context.tenant_context !== tenantB) {
    failedCondition = "tenant_context must equal Tenant B (Actual: " + context.tenant_context + ")";
  } else if (context.bypass_context !== null && context.bypass_context !== "") {
    failedCondition = "bypass_context must be null/empty/unset (Actual: " + context.bypass_context + ")";
  } else if (rows.length !== 1) {
    failedCondition = "Exactly ONE Subscription row must be visible (Actual count: " + rows.length + ")";
  } else if (rows[0].tenantId !== tenantB) {
    failedCondition = "The visible row's tenantId must equal Tenant B (Actual: " + rows[0].tenantId + ")";
  } else if (rows[0].status !== "RLS_TEST_B") {
    failedCondition = "The visible row's status must equal RLS_TEST_B (Actual: " + rows[0].status + ")";
  } else if (rows.some(r => r.tenantId === tenantA)) {
    failedCondition = "Tenant A UUID must NOT appear";
  } else if (rows.some(r => r.status === "RLS_TEST_A")) {
    failedCondition = "Tenant A status (RLS_TEST_A) must NOT appear";
  }

  if (failedCondition) {
    console.log("RLS TENANT-B ISOLATION TEST: FAIL");
    console.log("Failed condition: " + failedCondition);
  } else {
    console.log("RLS TENANT-B ISOLATION TEST: PASS");
  }

  console.log("current_user:", context.current_user);
  console.log("session_user:", context.session_user);
  console.log("tenant_context:", context.tenant_context);
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
