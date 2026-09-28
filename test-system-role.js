const { Client } = require("pg");

const client = new Client({
  host: process.env.CRM_STAGING_HOST,
  port: Number(process.env.CRM_STAGING_PORT),
  database: process.env.CRM_STAGING_DATABASE,
  user: "crm_system_user",
  password: process.env.CRM_STAGING_SYSTEM_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(() =>
    client.query(`
      SELECT
        current_user,
        session_user,
        rolsuper,
        rolbypassrls
      FROM pg_roles
      WHERE rolname = current_user
    `)
  )
  .then((result) => console.log(result.rows))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
