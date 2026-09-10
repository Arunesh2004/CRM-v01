const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const tables = await c.query("SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position");
  const constraints = await c.query("SELECT conname, contype, conrelid::regclass as relname, pg_get_constraintdef(c.oid) as condef FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public'");
  const indexes = await c.query("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'");
  const enums = await c.query("SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public'");
  
  fs.writeFileSync('docs/forensics/S3.8B_PRODUCTION_SCHEMA_FULL.json', JSON.stringify({tables: tables.rows, constraints: constraints.rows, indexes: indexes.rows, enums: enums.rows}, null, 2));
  await c.end();
}
main();
