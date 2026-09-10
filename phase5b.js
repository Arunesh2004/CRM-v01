const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const migrations = await c.query("SELECT id, migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count, logs FROM _prisma_migrations ORDER BY started_at ASC");
  fs.writeFileSync('docs/forensics/S3.8B_PRODUCTION_MIGRATIONS_FULL.json', JSON.stringify(migrations.rows, null, 2));
  await c.end();
}
main();
