import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Running Multi-Tenant Security Audit Tests ---');

  const srcDir = path.join(process.cwd(), '/src');

  let violations = 0;

  function walk(dir: string, ext: string, cb: (filepath: string, content: string) => void) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath, ext, cb);
      } else if (fullPath.endsWith(ext)) {
        cb(fullPath, fs.readFileSync(fullPath, 'utf8'));
      }
    }
  }

  console.log('\\n[1] Verifying Server Actions...');
  walk(path.join(srcDir, 'app'), '.ts', (filepath, content) => {
    // Only check files that appear to have server actions
    if (content.includes('"use server"') || content.includes("'use server'")) {
      if (content.includes('prisma.') && !content.includes('requireAuth')) {
        console.error(`Violation: Server action missing requireAuth() check in ${filepath}`);
        violations++;
      }
      
      // Specifically check if Prisma queries explicitly use tenantId
      if (content.match(/prisma\.[a-zA-Z0-9]+\.(findMany|findUnique|findFirst|update|delete|create)\(/)) {
        if (!content.includes('tenantId') && !content.includes('where: {') && !content.includes('id:')) {
           // Basic heuristics: if doing DB operations, must scope by tenantId
           console.warn(`Warning: Potential unscoped Prisma query in ${filepath}`);
        }
      }
    }
  });

  console.log('\\n[2] Verifying API Routes...');
  walk(path.join(srcDir, 'app/api'), 'route.ts', (filepath, content) => {
    if (filepath.includes('webhooks') || filepath.includes('health')) return; // Webhooks use Svix, Health is public
    if (content.includes('prisma.') && !content.includes('requireAuth')) {
      console.error(`Violation: API route missing requireAuth() check in ${filepath}`);
      violations++;
    }
  });

  console.log('\\n[3] Verifying Database Security (Prisma)...');
  const schemaPath = path.join(process.cwd(), '/database/schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const models = schemaContent.split('\nmodel ').slice(1);
    
    for (const modelDef of models) {
      const modelName = modelDef.split(' ')[0].trim();
      // Exclude global system models and infrastructure models
      if (['Tenant', 'User', 'WebhookEvent', 'Permission', 'RolePermission', 'UserRole', 'Plan', 'CCTVNode', 'RecordingIngestionJob', 'RetentionDeletionJob', 'AIAnalysisJob', 'AITool'].includes(modelName)) continue;
      
      if (!modelDef.includes('tenantId')) {
        console.error(`Violation: Model ${modelName} is missing tenantId relation!`);
        violations++;
      }
    }
  }

  console.log('\\n[4] Verifying RBAC Boundaries...');
  const authLibPath = path.join(srcDir, 'lib/auth.ts');
  if (fs.existsSync(authLibPath)) {
      const authContent = fs.readFileSync(authLibPath, 'utf8');
      if (!authContent.includes('requirePermission')) {
          console.error('Violation: requirePermission logic missing from auth abstraction.');
          violations++;
      }
  }

  if (violations > 0) {
    console.error(`\\n❌ Audit Failed with ${violations} violations.`);
    process.exit(1);
  } else {
    console.log('\\n✔ Multi-Tenant Security checks passed.');
    console.log('--- Tests Completed Successfully ---');
  }
}

runTests().catch(console.error);
