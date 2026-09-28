-- 1. Database identity
SELECT
    current_database() AS database_name,
    current_schema() AS schema_name,
    current_setting('server_version') AS postgres_version;

-- 2. Migration history
SELECT
    migration_name,
    finished_at,
    rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name IN (
    '20260910000000_canonical_baseline',
    '20260913000000_add_call_session',
    '20260914000000_rls_defect_remediation',
    '20260915154154_add_communication_references',
    '20260916000000_add_production_call_session'
)
ORDER BY migration_name;

-- 3. CallSession columns
SELECT
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'CallSession'
ORDER BY ordinal_position;

-- 4. CallSession row count
SELECT COUNT(*) AS call_session_count
FROM public."CallSession";

-- 5. Enum values
SELECT
    t.typname AS enum_name,
    e.enumlabel,
    e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'CallSessionStatus'
ORDER BY e.enumsortorder;

-- 6. CallSession foreign keys
SELECT
    conname,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public."CallSession"'::regclass
  AND contype = 'f'
ORDER BY conname;

-- 7. CallSession indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'CallSession'
ORDER BY indexname;

-- 8. CallLog unique index
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'CallLog_tenantId_providerCallId_key';

-- 9. CallSession RLS
SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS force_rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'CallSession';

-- 10. CallSession policy
SELECT
    polname,
    polpermissive,
    polroles,
    polcmd,
    pg_get_expr(polqual, polrelid) AS using_expression,
    pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy
WHERE polrelid = 'public."CallSession"'::regclass;

-- 11. CallLog duplicate safety
SELECT
    "tenantId",
    "providerCallId",
    COUNT(*) AS duplicate_count
FROM public."CallLog"
WHERE "providerCallId" IS NOT NULL
GROUP BY "tenantId", "providerCallId"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 12. Communication reference columns
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
      (table_name = 'ChatMessage'
       AND column_name IN ('referenceType','referenceId'))
      OR
      (table_name = 'MailMessage'
       AND column_name IN ('referenceType','referenceId'))
  )
ORDER BY table_name, column_name;

-- 13. Confirm CallSession has no unexpected rows
SELECT COUNT(*) AS call_session_rows
FROM public."CallSession";

-- 14. Confirm migration 130 itself is absent
SELECT COUNT(*) AS migration_130_count
FROM "_prisma_migrations"
WHERE migration_name = '20260913000000_add_call_session';
