const { Client } = require("pg");

const client = new Client({
  host: process.env.CRM_STAGING_HOST,
  port: Number(process.env.CRM_STAGING_PORT),
  database: process.env.CRM_STAGING_DATABASE,
  user: "crm_app_user",
  password: process.env.CRM_STAGING_APP_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(() =>
    client.query(`
      SELECT
        current_user,
        session_user,
        current_setting('app.current_tenant_id', true) AS tenant_context,
        current_setting('app.bypass_rls', true) AS bypass_context
    `)
  )
  .then((result) => console.log(result.rows))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
