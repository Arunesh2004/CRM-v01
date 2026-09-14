const fs = require('fs');
const file = 'src/lib/queue/worker.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "return await handler(tx as unknown as Tx, envelope.payload);",
  `const startTime = Date.now();
          Logger.info('Worker job started', { 
            jobId: envelope.jobId, 
            jobType: envelope.jobType, 
            tenantId: envelope.tenantId, 
            correlationId: envelope.correlationId 
          });

          try {
            const result = await handler(tx as unknown as Tx, envelope.payload);
            const durationMs = Date.now() - startTime;
            Logger.info('Worker job completed successfully', { 
              jobId: envelope.jobId, 
              jobType: envelope.jobType, 
              tenantId: envelope.tenantId, 
              correlationId: envelope.correlationId,
              durationMs
            });
            return result;
          } catch (eRaw: unknown) {
            const durationMs = Date.now() - startTime;
            const e = eRaw instanceof Error ? eRaw : new Error(String(eRaw));
            let failureCategory = 'APPLICATION_ERROR';
            let retryable = true;
            
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
              if (e.code === 'P2024' || e.code === 'P2034') {
                failureCategory = 'DATABASE_TRANSIENT';
              } else {
                failureCategory = 'DATABASE_ERROR';
              }
            } else if (e.name === 'NonRetriableError') {
              retryable = false;
              failureCategory = 'PERMANENT_ERROR';
            }

            Logger.error('Worker job failed', e, { 
              jobId: envelope.jobId, 
              jobType: envelope.jobType, 
              tenantId: envelope.tenantId, 
              correlationId: envelope.correlationId,
              durationMs,
              failureCategory,
              retryable
            });
            throw e;
          }`
);

content = content.replace(
  "Logger.error('FATAL: Failed to write to DLQ', dbError);",
  "Logger.error('FATAL: Failed to write to DLQ', dbError, { tenantId: envelope.tenantId, jobId: envelope.jobId, jobType: envelope.jobType, correlationId: envelope.correlationId });"
);

fs.writeFileSync(file, content);
console.log('done');
