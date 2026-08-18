const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
const migrations = fs.readdirSync(migrationsDir);
const revenueMigrationDir = migrations.find(m => m.includes('phase10_revenue_core'));

if (!revenueMigrationDir) {
  console.error("Migration not found");
  process.exit(1);
}

const migrationFilePath = path.join(migrationsDir, revenueMigrationDir, 'migration.sql');

const tables = [
  'ProductCategory',
  'ProductFamily',
  'Product',
  'PriceBook',
  'PriceBookEntry',
  'DiscountRule',
  'Quote',
  'QuoteLineItem'
];

let rlsSql = `\n-- Phase 10.1: Revenue Management RLS Enforcement\n\n`;

for (const table of tables) {
  rlsSql += `-- RLS for ${table}\n`;
  rlsSql += `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;\n`;
  rlsSql += `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;\n`;
  rlsSql += `CREATE POLICY "Tenant isolation for ${table}" ON "${table}"\n`;
  rlsSql += `  FOR ALL\n`;
  rlsSql += `  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));\n\n`;
}

fs.appendFileSync(migrationFilePath, rlsSql);
console.log("Appended RLS to migration " + revenueMigrationDir);
