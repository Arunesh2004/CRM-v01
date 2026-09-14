const fs = require('fs');
let fmFile = 'src/tests/observability/failure-modes.test.ts';
let fmContent = fs.readFileSync(fmFile, 'utf8');

fmContent = fmContent.replace(
  `import { outboxWorkerHandler } from '@/lib/queue/functions/outbox.worker';
import { SecureJobEnvelope } from '@/lib/queue/types';`,
  `import { outboxWorkerHandler } from '@/lib/queue/functions/outbox.worker';
import { SecureJobEnvelope } from '@/lib/queue/types';
import globalPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';`
);

fmContent = fmContent.replace(
  `describe('Phase 10 Failure Mode & Provider Behavior Tests', () => {
  let testTenantId = '`,
  `describe('Phase 10 Failure Mode & Provider Behavior Tests', () => {
  let testTenantId = '`
);

// We need to change beforeEach to create tenant
const newBeforeEach = `  beforeEach(async () => {
    vi.clearAllMocks();
    const t = await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.create({ data: { name: 'test' } }));
    testTenantId = t.id;
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.deleteMany({ where: { id: testTenantId } }));
  });`;

fmContent = fmContent.replace(
  /beforeEach\(\(\) => \{\n    vi\.clearAllMocks\(\);\n  \}\);/,
  newBeforeEach
);

fs.writeFileSync(fmFile, fmContent);

console.log('done');
