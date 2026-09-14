const fs = require('fs');

let corrFile = 'src/tests/observability/correlation.test.ts';
let content = fs.readFileSync(corrFile, 'utf8');

// replace the mock creation
content = content.replace(
  "import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';",
  "import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';\nimport { withTenant } from '@db/utils/prisma';"
);

content = content.replace(
  /await executeAsSystem\(SystemOperation\.PLATFORM_EVENT, async tx => tx\.eventOutbox\.create\(\{/g,
  "await withTenant(testTenantId).eventOutbox.create({"
);
content = content.replace(
  /status: 'PENDING'\n      \}\)\);/g,
  "status: 'PENDING'\n      });"
);

fs.writeFileSync(corrFile, content);

console.log('done');
