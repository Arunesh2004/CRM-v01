import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: [] });

async function verifyIndexes() {
  console.log('--- Phase 11 Index Utilization Verification ---');
  await prisma.$executeRawUnsafe('ANALYZE "Customer"');
  await prisma.$executeRawUnsafe('ANALYZE "Lead"');
  await prisma.$executeRawUnsafe('ANALYZE "Task"');
  await prisma.$executeRawUnsafe('ANALYZE "EventOutbox"');
  const tenantId = 'load-tenant-1';

  const queries = [
    {
      name: 'CRM List Customers',
      sql: `EXPLAIN ANALYZE SELECT * FROM "Customer" WHERE "tenantId" = '${tenantId}' AND "deletedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 50 OFFSET 0`
    },
    {
      name: 'CRM Search Leads',
      sql: `EXPLAIN ANALYZE SELECT * FROM "Lead" WHERE "tenantId" = '${tenantId}' AND "name" ILIKE '%Corp%' AND "deletedAt" IS NULL`
    },
    {
      name: 'Pending Tasks by Assignee',
      sql: `EXPLAIN ANALYZE SELECT * FROM "Task" WHERE "tenantId" = '${tenantId}' AND "status" = 'PENDING' AND "deletedAt" IS NULL ORDER BY "dueDate" ASC`
    },
    {
      name: 'EventOutbox Polling',
      sql: `EXPLAIN ANALYZE SELECT * FROM "EventOutbox" WHERE "status" = 'PENDING' AND "retryCount" < 3 ORDER BY "createdAt" ASC LIMIT 100`
    }
  ];

  for (const q of queries) {
    console.log(`\n=> Analyzing: ${q.name}`);
    const result: any[] = await prisma.$queryRawUnsafe(q.sql);
    result.forEach(row => console.log('  ' + row['QUERY PLAN']));
  }

  await prisma.$disconnect();
}

verifyIndexes().catch(console.error);
