const { Client } = require("pg");
const crypto = require("crypto");

const tenantA = crypto.randomUUID();
const tenantB = crypto.randomUUID();
const subA = crypto.randomUUID();
const subB = crypto.randomUUID();

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

  await client.query(
    `INSERT INTO "Tenant" ("id", "name", "createdAt", "updatedAt")
     VALUES
       ($1, 'RLS Test Tenant A', NOW(), NOW()),
       ($2, 'RLS Test Tenant B', NOW(), NOW())`,
    [tenantA, tenantB]
  );

  await client.query(
    `INSERT INTO "Subscription"
      ("id", "tenantId", "status", "createdAt", "updatedAt")
     VALUES
      ($1, $2, 'RLS_TEST_A', NOW(), NOW()),
      ($3, $4, 'RLS_TEST_B', NOW(), NOW())`,
    [subA, tenantA, subB, tenantB]
  );

  console.log({
    tenantA,
    tenantB,
    subscriptionA: subA,
    subscriptionB: subB,
  });
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
