require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx prisma migrate diff --from-url "' + process.env.DATABASE_URL + '" --to-schema-datamodel database/schema.prisma --script', { encoding: 'utf8' });
  
  // Also prepend vector extension
  const finalSql = `CREATE EXTENSION IF NOT EXISTS vector;\n\n${output}`;
  
  fs.writeFileSync('database/migrations/20260818000000_phase9_remediation/migration.sql', finalSql);
  console.log('Migration generated successfully');
} catch (e) {
  console.error(e.stderr || e.message);
}
