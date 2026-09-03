import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import prisma from '@db/utils/prisma';

const _orig_GET = async function () {
  const status: any = {
    status: 'ok',
    database: 'unknown'
  };

  try {
    // Attempt a lightweight DB query
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'connected';
  } catch (error) {
    status.database = 'disconnected';
    status.status = 'degraded';
  }

  const isConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY && !!process.env.DATABASE_URL;
  if (!isConfigured) {
    status.status = 'misconfigured';
  }

  const httpStatus = status.status === 'ok' ? 200 : (status.status === 'misconfigured' ? 500 : 503);

  return NextResponse.json(status, { status: httpStatus });
}

export const GET = withApiContext(_orig_GET);
