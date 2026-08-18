import * as fs from 'fs';
import * as path from 'path';

const searchDir = path.join(__dirname, '../src/modules');

function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk(searchDir);
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('prisma.$transaction(async (tx') && content.includes('tenantId')) {
    let modified = false;

    // 1. Add global prisma import if missing
    if (!content.includes('import globalPrisma from')) {
      // Find the first import
      content = content.replace(/import {?[^}]*}? from '[^']+';\n/, match => `${match}import globalPrisma from '@/../database/utils/prisma';\n`);
      modified = true;
    }

    // 2. Add withTenantTransaction to imports if missing
    if (!content.includes('withTenantTransaction')) {
      content = content.replace(/withTenant(\s|,)/g, 'withTenant, withTenantTransaction$1');
      modified = true;
    }

    // 3. Replace prisma.$transaction with globalPrisma.$transaction
    // and inject tx re-assignment
    const txRegex1 = /prisma\.\$transaction\(async\s*\(\s*tx\s*\)\s*=>\s*\{/g;
    const txRegex2 = /prisma\.\$transaction\(async\s*\(\s*tx:\s*any\s*\)\s*=>\s*\{/g;

    const replaceStr = `globalPrisma.$transaction(async (baseTx: any) => {\n    const tx = await withTenantTransaction(baseTx, tenantId);`;

    if (txRegex1.test(content) || txRegex2.test(content)) {
      content = content.replace(txRegex1, replaceStr).replace(txRegex2, replaceStr);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
      changedCount++;
    }
  }
}

console.log(`Total files updated: ${changedCount}`);
