const fs = require('fs');

const uuid = '123e4567-e89b-12d3-a456-426614174000';

// 1. Fix correlation.test.ts
let corrFile = 'src/tests/observability/correlation.test.ts';
let corrContent = fs.readFileSync(corrFile, 'utf8');

const corrTenantCode = `  let testTenantId = '';
  beforeEach(async () => {
    vi.clearAllMocks();
    await globalPrisma.eventOutbox.deleteMany();
    await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.user.create({ data: { id: 'user1', email: 'test@example.com', name: 'test' } }).catch(() => {}));
    const t = await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.create({ data: { name: 'test', ownerId: 'user1' } }));
    testTenantId = t.id;
  });`;

corrContent = corrContent.replace(
  /beforeEach\(async \(\) => \{[\s\S]*?testTenantId = t\.id;\n  \}\);/,
  corrTenantCode
);
fs.writeFileSync(corrFile, corrContent);

// 2. Fix failure-modes.test.ts
let fmFile = 'src/tests/observability/failure-modes.test.ts';
let fmContent = fs.readFileSync(fmFile, 'utf8');

const fmTenantCode = `import globalPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

describe('Phase 10 Failure Mode & Provider Behavior Tests', () => {
  let testTenantId = '';
  beforeEach(async () => {
    vi.clearAllMocks();
    await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.user.create({ data: { id: 'user2', email: 'test2@example.com', name: 'test2' } }).catch(() => {}));
    const t = await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.create({ data: { name: 'test2', ownerId: 'user2' } }));
    testTenantId = t.id;
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.deleteMany({ where: { id: testTenantId } }));
  });`;

fmContent = fmContent.replace(
  `describe('Phase 10 Failure Mode & Provider Behavior Tests', () => {\n  beforeEach(() => {\n    vi.clearAllMocks();\n  });`,
  fmTenantCode
);

fmContent = fmContent.replace(
  /import { GoogleGenAI } from '@google\/genai';/,
  `import { GoogleGenAI } from '@google/genai';\nimport globalPrisma from '@db/utils/prisma';\nimport { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';`
);

fmContent = fmContent.replaceAll(`tenantId: '${uuid}'`, `tenantId: testTenantId`);

const mockGenAi = `
vi.mock('@google/genai', () => {
  const GoogleGenAI = vi.fn();
  GoogleGenAI.prototype.models = {
    generateContent: vi.fn().mockImplementation(async (req) => {
       if (req.contents[0].parts[0].text === '429') {
          const err = new Error('Too Many Requests');
          err.status = 429;
          throw err;
       }
       if (req.contents[0].parts[0].text === '401') {
          const err = new Error('API_KEY_INVALID');
          err.status = 401;
          throw err;
       }
       return { text: 'ok' };
    })
  };
  return { GoogleGenAI };
});
`;

fmContent = fmContent.replace(
  /vi\.mock\('@google\/genai'[\s\S]*?\}\);\s*}\);\s*}\);\s*}\);\s*/,
  mockGenAi
);
fs.writeFileSync(fmFile, fmContent);

console.log('done');
