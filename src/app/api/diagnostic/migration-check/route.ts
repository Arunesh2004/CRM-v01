import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { requireAuth } from '@/lib/auth';

const _orig_GET = async function () {
  try {
    const authUser = await requireAuth();
    
    // Enforce GLOBAL_ADMIN access only for diagnostic info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isGlobalAdmin = authUser.userRoles.some((ur: any) => ur.role?.name === 'GLOBAL_ADMIN');
    if (!isGlobalAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const diagnosticData = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // 1. Check table existence and RLS
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt
    const pgClassResult = await tx.$queryRawUnsafe<any[]>(`
        SELECT relname, relrowsecurity, relforcerowsecurity 
        FROM pg_class 
        WHERE relname = 'CallSession';
      `);
      
      const callSessionTableExists = pgClassResult.length > 0;
      const rlsEnabled = callSessionTableExists ? pgClassResult[0].relrowsecurity : false;
      const forceRlsEnabled = callSessionTableExists ? pgClassResult[0].relforcerowsecurity : false;

      // 2. Check RLS policy existence
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt
      const pgPolicyResult = await tx.$queryRawUnsafe<any[]>(`
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'CallSession' AND policyname = 'tenant_isolation_CallSession';
      `);
      
      const callSessionPolicyExists = pgPolicyResult.length > 0;

      // 3. Check migration bookkeeping
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt
      const migrationResult = await tx.$queryRawUnsafe<any[]>(`
        SELECT migration_name, finished_at, rolled_back_at 
        FROM _prisma_migrations 
        WHERE migration_name = '20260916000000_add_production_call_session';
      `);

      let migrationRecordExists = false;
      let migrationFinished = false;
      let migrationRolledBack = false;

      if (migrationResult.length > 0) {
        migrationRecordExists = true;
        const row = migrationResult[0];
        if (row.finished_at !== null) {
          migrationFinished = true;
        }
        if (row.rolled_back_at !== null) {
          migrationRolledBack = true;
        }
      }

      return {
        callSessionTableExists,
        rlsEnabled,
        forceRlsEnabled,
        callSessionPolicyExists,
        migrationRecordExists,
        migrationFinished,
        migrationRolledBack
      };
    });

    return NextResponse.json(diagnosticData);
  } catch (errorRaw: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentionally ignored for security
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return NextResponse.json({ error: 'Internal Diagnostic Error' }, { status: 500 });
  }
}

export const GET = withApiContext(_orig_GET);
