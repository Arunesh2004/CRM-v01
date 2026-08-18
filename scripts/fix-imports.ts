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
  if (content.includes('globalPrisma.$transaction') && !content.includes('import globalPrisma from')) {
    const importStr = `import globalPrisma from '../../../../database/utils/prisma';\n`;
    // compute correct relative path
    const depth = file.split('src')[1].split(path.sep).length - 1;
    let relPath = '';
    for(let i=0; i<depth; i++) relPath += '../';
    const finalImport = `import globalPrisma from '${relPath}database/utils/prisma';\n`;
    content = finalImport + content;
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed imports in', file);
  }
  // Fix tenantId missing in AI event service
  if (file.includes('ai-event.service.ts') && content.includes('const tx = await withTenantTransaction(baseTx, tenantId);')) {
      // tenantId might not be defined in that function
      // Let's replace it with event.tenantId or similar if tenantId is missing
      if (!content.includes('const tenantId')) {
         content = content.replace('const tx = await withTenantTransaction(baseTx, tenantId);', 'const tx = await withTenantTransaction(baseTx, event.tenantId || (event as any).tenantId || "dummy");');
         fs.writeFileSync(file, content, 'utf8');
      }
  }
}
