import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth(); // Enforce authentication

    // Parse the DB URL safely without exposing credentials
    let dbHost = 'unknown';
    let dbProvider = 'unknown';
    try {
      if (process.env.DATABASE_URL) {
        const url = new URL(process.env.DATABASE_URL);
        dbHost = url.hostname;
        if (dbHost.includes('supabase')) {
          dbProvider = 'supabase';
        } else if (dbHost.includes('neon')) {
          dbProvider = 'neon';
        }
      }
    } catch (e) {
      dbHost = 'invalid-url';
    }

    // Parse Redis URL safely
    let redisHost = 'unknown';
    try {
      if (process.env.REDIS_URL) {
        const url = new URL(process.env.REDIS_URL);
        redisHost = url.hostname;
      }
    } catch (e) {
      redisHost = 'invalid-url';
    }

    return NextResponse.json({
      environment: process.env.VERCEL_ENV || 'unknown',
      vercelUrl: process.env.VERCEL_URL || 'unknown',
      database: {
        provider: dbProvider,
        host: dbHost
      },
      redis: {
        host: redisHost
      },
      gemini: {
        configured: !!process.env.GEMINI_API_KEY
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
