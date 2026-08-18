const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { regex, replacement } of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(filePath, content);
}

const dbPrismaPath = "import prisma from '../../../../database/utils/prisma';";

const replacements = [
  { regex: /import \{ prisma \} from '\.\.\/\.\.\/\.\.\/lib\/prisma';/g, replacement: "import prisma from '../../../../database/utils/prisma';" },
  { regex: /import \{ SecurityEventLogger \} from '\.\.\/\.\.\/\.\.\/modules\/security\/security-logger\.service';/g, replacement: "import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';" },
  { regex: /SecurityEventLogger\.logEvent/g, replacement: "SecurityEventService.logEvent" }
];

const files = [
  'src/modules/ai/context/context-builder.service.ts',
  'src/modules/ai/rag/embedding.service.ts',
  'src/modules/ai/memory/memory.service.ts',
  'src/modules/ai/workflow/workflow.service.ts',
  'src/modules/ai/observability/token.service.ts',
];

for (const file of files) {
  replaceInFile(path.join(__dirname, '..', file), replacements);
}

// Fix test file separately due to path depth differences
const testPath = path.join(__dirname, '../src/tests/security/ai-platform-security.test.ts');
replaceInFile(testPath, [
  { regex: /import \{ prisma \} from '\.\.\/\.\.\/\.\.\/src\/lib\/prisma';/g, replacement: "import prisma from '../../../database/utils/prisma';" }
]);

console.log('Fixed imports!');
