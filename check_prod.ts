import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runQuery(name: string, query: string) {
  try {
    const result = await prisma.$queryRawUnsafe(query);
    console.log(`=== ${name} ===`);
    console.log(result);
  } catch (error: any) {
    console.log(`=== ${name} ERROR ===`);
    console.log(error.message);
  }
}

async function run() {
  await runQuery("MIGRATIONS", `
    SELECT migration_name, finished_at, rolled_back_at 
    FROM "_prisma_migrations"
    WHERE migration_name IN (
      '20260910000000_canonical_baseline',
      '20260913000000_add_call_session',
      '20260914000000_rls_defect_remediation',
      '20260915154154_add_communication_references',
      '20260916000000_add_production_call_session'
    )
    ORDER BY migration_name;
  `);

  await runQuery("SCHEMA", `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CallSession'
    ORDER BY ordinal_position;
  `);

  await runQuery("CALLSESSION COUNT", `SELECT COUNT(*) AS call_session_count FROM public."CallSession";`);

  await runQuery("ENUMS", `
    SELECT t.typname AS enum_name, e.enumlabel, e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'CallSessionStatus'
    ORDER BY e.enumsortorder;
  `);

  await runQuery("FKS", `
    SELECT conname, pg_get_constraintdef(oid) AS constraint_definition
    FROM pg_constraint
    WHERE conrelid = 'public."CallSession"'::regclass AND contype = 'f'
    ORDER BY conname;
  `);

  await runQuery("IDX CallSession", `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'CallSession'
    ORDER BY indexname;
  `);

  await runQuery("IDX CallLog", `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'CallLog_tenantId_providerCallId_key';
  `);

  await runQuery("RLS", `
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'CallSession';
  `);

  await runQuery("POLICY", `
    SELECT polname, polpermissive, polroles, polcmd,
           pg_get_expr(polqual, polrelid) AS using_expression,
           pg_get_expr(polwithcheck, polrelid) AS with_check_expression
    FROM pg_policy
    WHERE polrelid = 'public."CallSession"'::regclass;
  `);

  await runQuery("CALLLOG COUNT", `SELECT COUNT(*) AS call_log_count FROM public."CallLog";`);

  await runQuery("CALLLOG DUPS", `
    SELECT "tenantId", "providerCallId", COUNT(*) AS duplicate_count
    FROM public."CallLog"
    WHERE "providerCallId" IS NOT NULL
    GROUP BY "tenantId", "providerCallId"
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC;
  `);

  await runQuery("COMM REFS", `
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
          (table_name = 'ChatMessage' AND column_name IN ('referenceType','referenceId'))
          OR
          (table_name = 'MailMessage' AND column_name IN ('referenceType','referenceId'))
      )
    ORDER BY table_name, column_name;
  `);

  await runQuery("M130", `
    SELECT
        EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'CallSessionStatus'
        ) AS callsession_enum_exists,
        EXISTS (
            SELECT 1 FROM pg_class WHERE relname = 'CallSession' AND relnamespace = 'public'::regnamespace
        ) AS callsession_table_exists;
  `);

  await prisma.$disconnect();
}
run();
