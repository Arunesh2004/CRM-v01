const fs = require('fs');

let corrFile = 'src/tests/observability/correlation.test.ts';
let corrContent = fs.readFileSync(corrFile, 'utf8');

corrContent = corrContent.replace(
  /await executeAsSystem\(SystemOperation\.PLATFORM_EVENT, async tx => tx\.user\.upsert\(\{ where: \{ id: 'user1' \}, update: \{\}, create: \{ id: 'user1', email: 'test@example\.com', name: 'test' \} \}\)\);\s*const t = await executeAsSystem\(SystemOperation\.PLATFORM_EVENT, async tx => tx\.tenant\.create\(\{ data: \{ name: 'test', ownerId: 'user1' \} \}\)\);/,
  `const t = await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.create({ data: { name: 'test' } }));`
);
fs.writeFileSync(corrFile, corrContent);


let fmFile = 'src/tests/observability/failure-modes.test.ts';
let fmContent = fs.readFileSync(fmFile, 'utf8');

fmContent = fmContent.replace(
  /await executeAsSystem\(SystemOperation\.PLATFORM_EVENT, async tx => tx\.user\.upsert\(\{ where: \{ id: 'user2' \}, update: \{\}, create: \{ id: 'user2', email: 'test2@example\.com', name: 'test2' \} \}\)\);\s*const t = await executeAsSystem\(SystemOperation\.PLATFORM_EVENT, async tx => tx\.tenant\.create\(\{ data: \{ name: 'test2', ownerId: 'user2' \} \}\)\);/,
  `const t = await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.create({ data: { name: 'test2' } }));`
);

fs.writeFileSync(fmFile, fmContent);

console.log('done');
