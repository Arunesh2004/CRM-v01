const fs = require('fs');

const uuid = '123e4567-e89b-12d3-a456-426614174000';

// 1. Fix isolated-restore.test.ts
let drFile = 'src/tests/dr/isolated-restore.test.ts';
let drContent = fs.readFileSync(drFile, 'utf8');
drContent = drContent.replaceAll('00000000-0000-0000-0000-000000000000', uuid);
fs.writeFileSync(drFile, drContent);

// 2. Fix failure-modes.test.ts
let fmFile = 'src/tests/observability/failure-modes.test.ts';
let fmContent = fs.readFileSync(fmFile, 'utf8');
fmContent = fmContent.replaceAll('tenant-1', uuid);

const mockGenAi = `
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
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
      }
    }
  };
});
`;

fmContent = fmContent.replace(
  /vi\.mock\('@google\/genai'[\s\S]*?\}\);\s*}\);\s*}\);\s*}\);\s*/,
  mockGenAi
);
fs.writeFileSync(fmFile, fmContent);

// 3. Fix correlation.test.ts
let corrFile = 'src/tests/observability/correlation.test.ts';
let corrContent = fs.readFileSync(corrFile, 'utf8');

corrContent = corrContent.replaceAll('00000000-0000-0000-0000-000000000000', uuid);

// Create tenant first
const tenantCode = `  let testTenantId = '';
  beforeEach(async () => {
    vi.clearAllMocks();
    await globalPrisma.eventOutbox.deleteMany();
    const t = await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.create({ data: { name: 'test', ownerId: 'user1' } }));
    testTenantId = t.id;
  });

  afterEach(async () => {
    await globalPrisma.eventOutbox.deleteMany();
    await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.deleteMany({ where: { id: testTenantId } }));
  });`;

corrContent = corrContent.replace(
  /beforeEach\(async \(\) => \{[\s\S]*?\}\);/,
  tenantCode
);

corrContent = corrContent.replaceAll(`tenantId: '${uuid}'`, `tenantId: testTenantId`);

fs.writeFileSync(corrFile, corrContent);
console.log('done');
