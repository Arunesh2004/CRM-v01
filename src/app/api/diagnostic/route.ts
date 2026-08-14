import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any = {};
  
  try {
    const startInit = performance.now();
    const prisma = new PrismaClient({ log: ['warn', 'error'] });
    results.initTime = performance.now() - startInit;

    const startFirst = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    results.firstTime = performance.now() - startFirst;

    const startSecond = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    results.secondTime = performance.now() - startSecond;

    const startSeq = performance.now();
    await prisma.$queryRaw`SELECT pg_sleep(1)`;
    await prisma.$queryRaw`SELECT pg_sleep(1)`;
    results.seqTime = performance.now() - startSeq;

    const startConc = performance.now();
    await Promise.all([
      prisma.$queryRaw`SELECT pg_sleep(1)`,
      prisma.$queryRaw`SELECT pg_sleep(1)`
    ]);
    results.concTime = performance.now() - startConc;

    const startConc3 = performance.now();
    await Promise.all([
      prisma.$queryRaw`SELECT pg_sleep(1)`,
      prisma.$queryRaw`SELECT pg_sleep(1)`,
      prisma.$queryRaw`SELECT pg_sleep(1)`
    ]);
    results.conc3Time = performance.now() - startConc3;

    const startConc5 = performance.now();
    await Promise.all([
      prisma.$queryRaw`SELECT pg_sleep(1)`,
      prisma.$queryRaw`SELECT pg_sleep(1)`,
      prisma.$queryRaw`SELECT pg_sleep(1)`,
      prisma.$queryRaw`SELECT pg_sleep(1)`,
      prisma.$queryRaw`SELECT pg_sleep(1)`
    ]);
    results.conc5Time = performance.now() - startConc5;

    await prisma.$disconnect();

    const prismaDirect = new PrismaClient({
      datasourceUrl: process.env.DIRECT_URL,
      log: ['warn', 'error']
    });

    const startDirectConc = performance.now();
    await Promise.all([
      prismaDirect.$queryRaw`SELECT pg_sleep(1)`,
      prismaDirect.$queryRaw`SELECT pg_sleep(1)`
    ]);
    results.directConcTime = performance.now() - startDirectConc;
    
    await prismaDirect.$disconnect();

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    results.error = error.message;
  }

  return NextResponse.json(results);
}
