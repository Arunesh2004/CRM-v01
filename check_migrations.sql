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
