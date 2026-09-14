const fs = require('fs');
let content = fs.readFileSync('database/utils/prisma.ts', 'utf8');

// Insert import
if (!content.includes("import { requestContext } from '@/lib/observability/context';")) {
  content = "import { requestContext } from '@/lib/observability/context';\n" + content;
}

const middleware = `
      eventOutbox: {
        async $allOperations({ operation, args, query }) {
          if (['create', 'createMany', 'update', 'upsert'].includes(operation)) {
            const ctx = requestContext.getStore();
            const processData = (data: any) => {
              if (data && typeof data === 'object' && data.payload && typeof data.payload === 'object') {
                if (ctx?.requestId || ctx?.jobId) {
                  data.payload._sys_correlationId = ctx.requestId || ctx.jobId;
                } else {
                  // Aggressively remove any user-spoofed correlation ID if no trusted context exists
                  delete data.payload._sys_correlationId;
                }
              }
            };
            if (args.data) {
              if (Array.isArray(args.data)) args.data.forEach(processData);
              else processData(args.data);
            }
          }
          return query(args);
        }
      },
`;

if (!content.includes('eventOutbox: {') && content.includes('query: {')) {
  content = content.replace('query: {', 'query: {' + middleware);
  fs.writeFileSync('database/utils/prisma.ts', content);
}
console.log('done');
