const fs = require('fs');
const file = 'database/utils/prisma.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const inject = (data: any) => {
                if (data && typeof data === 'object' && data.payload && typeof data.payload === 'object') {
                  data.payload._sys_correlationId = ctx.requestId;
                }
              };
              if (args.data) {
                if (Array.isArray(args.data)) args.data.forEach(inject);
                else inject(args.data);
              }`,
  `const inject = (data: any) => {
                if (data && typeof data === 'object' && data.payload && typeof data.payload === 'object') {
                  data.payload._sys_correlationId = ctx.requestId;
                }
              };
              if (args.data) {
                if (Array.isArray(args.data)) args.data.forEach(inject);
                else inject(args.data);
              }`
);

// Actually, I can just replace the whole block again.
const oldBlock = `          if (['create', 'createMany', 'update', 'upsert'].includes(operation)) {
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
          }`;

const newBlock = `          if (['create', 'createMany', 'update', 'upsert'].includes(operation)) {
            const ctx = getContext();
            const processData = (data: any) => {
              if (data && typeof data === 'object' && data.payload && typeof data.payload === 'object') {
                if (ctx?.requestId) {
                  data.payload._sys_correlationId = ctx.requestId;
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
          }`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(file, content);
}
console.log('done');
