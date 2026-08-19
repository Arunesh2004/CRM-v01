import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const directUrl = process.env.DIRECT_URL || '';
    const vercelEnv = process.env.VERCEL_ENV || 'unknown';

    const dbHash = crypto.createHash('sha256').update(dbUrl).digest('hex');
    const directHash = crypto.createHash('sha256').update(directUrl).digest('hex');

    // Parse host and dbname from DB URL if possible
    let host = 'unknown';
    let dbName = 'unknown';
    try {
      if (dbUrl) {
        const urlObj = new URL(dbUrl);
        host = urlObj.hostname;
        dbName = urlObj.pathname.slice(1);
      }
    } catch(e) {}

    const user = await prisma.user.findUnique({
      where: { email: 'aruneshsharma2004@gmail.com'.toLowerCase() },
      include: {
        roles: true
      }
    });

    const tenant = await prisma.tenant.findFirst({
      where: { name: 'Company Tenant' }
    });

    let buildDb = null;
    try {
      const fs = require('fs');
      const path = require('path');
      const buildDbPath = path.join(process.cwd(), 'public', 'build-db.json');
      buildDb = JSON.parse(fs.readFileSync(buildDbPath, 'utf8'));
    } catch(e) {}

    return NextResponse.json({
      environment: vercelEnv,
      buildConnection: buildDb,
      runtimeConnection: {
        host,
        dbName,
        dbHash,
        directHash
      },
      user: {
        exists: !!user,
        status: user?.status || null,
        tenantIdPresent: !!user?.tenantId,
        clerkIdPresent: !!user?.clerkId,
        roles: user?.roles?.map(r => r.role) || []
      },
      tenant: {
        exists: !!tenant,
        id: tenant?.id || null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
