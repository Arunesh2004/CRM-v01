const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '..', 'database', 'migrations', '20260818062424_phase10_2_sales_intel', 'migration.sql');
let sql = fs.readFileSync(migrationFile, 'utf-8');

const rlsScript = `
-- ==================================================
-- PHASE 10.2: RLS ENFORCEMENT
-- ==================================================

-- Territory
ALTER TABLE "Territory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Territory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_territory" ON "Territory"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

-- UserTerritory
ALTER TABLE "UserTerritory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTerritory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_user_territory" ON "UserTerritory"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

-- SalesQuota
ALTER TABLE "SalesQuota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesQuota" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_sales_quota" ON "SalesQuota"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

-- DealSnapshot
ALTER TABLE "DealSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealSnapshot" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_deal_snapshot" ON "DealSnapshot"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);
`;

if (!sql.includes('PHASE 10.2: RLS ENFORCEMENT')) {
    fs.writeFileSync(migrationFile, sql + rlsScript);
    console.log("Appended Phase 10.2 RLS to migration");
} else {
    console.log("RLS already present");
}
