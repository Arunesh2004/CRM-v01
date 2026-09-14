-- Phase 13 Step 11: Defect Remediation

-- 1. AIAnalysisJob Add nullable tenantId
ALTER TABLE "AIAnalysisJob" ADD COLUMN "tenantId" TEXT;

-- 2. Backfill tenantId from Recording
UPDATE "AIAnalysisJob"
SET "tenantId" = "Recording"."tenantId"
FROM "Recording"
WHERE "AIAnalysisJob"."recordingId" = "Recording"."id";

-- 3. Verify no unresolved orphaned rows exist
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM "AIAnalysisJob" WHERE "tenantId" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Found % unresolved AIAnalysisJob rows lacking a valid Recording tenantId.', orphan_count;
  END IF;
END $$;

-- 4. Establish NOT NULL constraint on tenantId
ALTER TABLE "AIAnalysisJob" ALTER COLUMN "tenantId" SET NOT NULL;

-- 5. Establish FK constraint
ALTER TABLE "AIAnalysisJob" ADD CONSTRAINT "AIAnalysisJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Add Indexes
CREATE INDEX "AIAnalysisJob_tenantId_idx" ON "AIAnalysisJob"("tenantId");
CREATE INDEX "CameraStreamInvalidation_tenantId_idx" ON "CameraStreamInvalidation"("tenantId");

-- 7. Add CameraStreamInvalidation tenantId FK
ALTER TABLE "CameraStreamInvalidation" ADD CONSTRAINT "CameraStreamInvalidation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Add CameraStreamInvalidation cameraId FK
ALTER TABLE "CameraStreamInvalidation" ADD CONSTRAINT "CameraStreamInvalidation_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Enable FORCE ROW LEVEL SECURITY
ALTER TABLE "AIAnalysisJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIAnalysisJob" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CameraStreamInvalidation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraStreamInvalidation" FORCE ROW LEVEL SECURITY;

-- 10. Create Tenant Isolation Policies
CREATE POLICY "tenant_isolation_AIAnalysisJob" ON "AIAnalysisJob"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "tenant_isolation_CameraStreamInvalidation" ON "CameraStreamInvalidation"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));
