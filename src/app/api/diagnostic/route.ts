import { NextResponse } from 'next/server';
import { executeAsSystem, SystemOperation } from '@/../database/utils/prisma-system';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { requireAuth, checkPermission } from '@/lib/auth';


export async function GET() {
  try {
    const authUser = await requireAuth();
    
    // Enforce GLOBAL_ADMIN access only for diagnostic info
    const isGlobalAdmin = authUser.userRoles.some((ur: any) => ur.role.name === 'GLOBAL_ADMIN');
    if (!isGlobalAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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

    const diagnosticData = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const u = await tx.user.findFirst({
        where: { email: 'aruneshsharma2004@gmail.com'.toLowerCase() },
        include: {
          userRoles: true
        }
      });
      const t = await tx.tenant.findFirst({
        where: { name: 'Company Tenant' }
      });
      return { user: u, tenant: t };
    });
    
    const { user, tenant } = diagnosticData;

    // Read build-time DB info
    let buildConnection = null;
    try {
      const buildFile = path.join(process.cwd(), 'public', 'build-db.json');
      if (fs.existsSync(buildFile)) {
        buildConnection = JSON.parse(fs.readFileSync(buildFile, 'utf8'));
      }
    } catch (e) {
      console.error('Error reading build-db.json:', e);
    }

    // Read seed-result.json
    let seedResult = null;
    try {
      const seedFile = path.join(process.cwd(), 'public', 'seed-result.json');
      if (fs.existsSync(seedFile)) {
        seedResult = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
      }
    } catch (e) {
      console.error('Error reading seed-result.json:', e);
    }

    return NextResponse.json({
      environment: vercelEnv,
      buildConnection: buildConnection,
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
        roles: user?.userRoles?.map((r: any) => r.role) || []
      },
      tenant: {
        exists: !!tenant,
        id: tenant?.id || null
      },
      seedResult
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
