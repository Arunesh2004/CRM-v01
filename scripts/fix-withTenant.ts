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

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  if (content.includes('withTenantTransaction(') && !content.includes('withTenantTransaction}')) {
     if (!content.includes('import { withTenantTransaction }') && !content.includes('import { withTenant, withTenantTransaction }')) {
         const lines = content.split('\n');
         const importStr = `import { withTenantTransaction } from '@/../database/utils/prisma-tenant';`;
         // Find last import
         let lastImportIdx = 0;
         for (let i = 0; i < lines.length; i++) {
             if (lines[i].startsWith('import ')) lastImportIdx = i;
         }
         lines.splice(lastImportIdx + 1, 0, importStr);
         content = lines.join('\n');
         modified = true;
     }
  }

  if (modified) {
     fs.writeFileSync(file, content, 'utf8');
     console.log('Fixed imports in', file);
  }
}
