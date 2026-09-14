const fs = require('fs');
const file = 'database/utils/prisma.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { getContext }')) {
  content = content.replace(
    'import { PrismaClient } from "@prisma/client";',
    'import { PrismaClient } from "@prisma/client";\nimport { getContext } from "@/lib/observability/context";'
  );
}

if (!content.includes('eventOutbox: {')) {
  const replacement = `cameraStream: {
        async $allOperations({ operation, args, query }) {`;
  
  const injectCode = `eventOutbox: {
        async $allOperations({ operation, args, query }) {
          if (['create', 'createMany', 'update', 'upsert'].includes(operation)) {
            const ctx = getContext();
            if (ctx?.requestId) {
              const inject = (data: any) => {
                if (data && typeof data === 'object' && data.payload && typeof data.payload === 'object') {
                  data.payload._sys_correlationId = ctx.requestId;
                }
              };
              if (args.data) {
                if (Array.isArray(args.data)) args.data.forEach(inject);
                else inject(args.data);
              }
            }
          }
          return query(args);
        }
      },
      cameraStream: {
        async $allOperations({ operation, args, query }) {`;

  content = content.replace(replacement, injectCode);
  fs.writeFileSync(file, content);
}
console.log('done');
