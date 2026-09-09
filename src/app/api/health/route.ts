import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import prisma from '@db/utils/prisma';

const _orig_GET = async function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  const status: any = {
    status: 'ok',
    database: 'unknown'
  };

  try {
    // Attempt a lightweight DB query
    await prisma.$queryRaw`SELECT 1`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
    status.database = 'connected';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
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
