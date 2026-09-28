const { Client } = require("pg");

const client = new Client({
  host: process.env.CRM_STAGING_HOST,
  port: Number(process.env.CRM_STAGING_PORT),
  database: process.env.CRM_STAGING_DATABASE,
  user: "crm_system_user",
  password: process.env.CRM_STAGING_SYSTEM_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  const result = await client.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Tenant'
    ORDER BY ordinal_position
  `);

  console.log(result.rows);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
