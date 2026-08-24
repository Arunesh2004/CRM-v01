import { NextResponse } from 'next/server';
import prisma from '@db/utils/prisma';

export async function GET() {
  const status = {
    status: 'ok',
    environment: process.env.NODE_ENV,
    config: {
      clerkPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      databaseUrl: !!process.env.DATABASE_URL
    },
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

  const isConfigured = status.config.clerkPublishableKey && status.config.clerkSecretKey && status.config.databaseUrl;
  if (!isConfigured) {
    status.status = 'misconfigured';
  }

  const httpStatus = status.status === 'ok' ? 200 : (status.status === 'misconfigured' ? 500 : 503);

  return NextResponse.json(status, { status: httpStatus });
}
