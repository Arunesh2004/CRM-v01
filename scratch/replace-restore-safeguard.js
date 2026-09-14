const fs = require('fs');
const file = 'src/modules/recovery/restore.engine.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('ALLOW_DESTRUCTIVE_RESTORE')) {
  content = content.replace(
    "export async function requestRestore(archiveLocation: string, checksum: string, requestorUserId: string, mode: 'RECOVERY' | 'CLONE' | 'DRY_RUN' = 'DRY_RUN') {",
    "export async function requestRestore(archiveLocation: string, checksum: string, requestorUserId: string, mode: 'RECOVERY' | 'CLONE' | 'DRY_RUN' = 'DRY_RUN') {\n  if (mode === 'RECOVERY' && process.env.ALLOW_DESTRUCTIVE_RESTORE !== 'true') {\n    throw new Error('Forbidden: Destructive RECOVERY mode is disabled in this environment.');\n  }"
  );
  fs.writeFileSync(file, content);
}
console.log('done');
