import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import prisma from '@db/utils/prisma';
import { redis } from '@/lib/cache/redis.client';
import { Logger } from '@/lib/logger/logger';

const _orig_GET = async function () {
  // DB is mandatory
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = 'error';
    Logger.error('Readiness check failed: DB unavailable', error instanceof Error ? error : new Error(String(error)));
  }

  // Redis is optional for availability, but we report its status
  let redisStatus = 'ok';
  try {
    if (redis) {
      await redis.ping();
    } else {
      redisStatus = 'not_configured';
    }
  } catch (error) {
    redisStatus = 'error';
    Logger.warn('Readiness check: Redis degraded', error instanceof Error ? error : new Error(String(error)));
  }

  const isReady = dbStatus === 'ok';

  const status = {
    status: isReady ? 'ready' : 'unready',
    dependencies: {
      database: dbStatus,
      redis: redisStatus,
    }
  };

  const httpStatus = isReady ? 200 : 503;

  return NextResponse.json(status, { status: httpStatus });
}

export const GET = withApiContext(_orig_GET);
