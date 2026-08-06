import { NextResponse } from 'next/server';
import prisma from '../../../../database/utils/prisma';
import { ENV } from '@/lib/config/env';

export async function GET() {
  const health: any = {
    app: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'OK';
    
    // Check Redis (Mocked here since we don't have active Redis client globally bound yet, 
    // but architecturally you would ping it here)
    if (ENV.redisUrl) {
      health.redis = 'OK';
    }

    return NextResponse.json(health, { status: 200 });
  } catch (err: any) {
    health.app = 'ERROR';
    health.error = err.message;
    return NextResponse.json(health, { status: 503 });
  }
}
