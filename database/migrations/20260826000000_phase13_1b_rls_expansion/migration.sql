-- =============================================================================
-- Phase 13.1B: RLS Relationship & Remaining Table Security Expansion
-- =============================================================================
-- Audit: Every table classified before inclusion.
-- Standard policy: tenantId = current_tenant_id OR bypass_rls = 'on'
-- WebhookEvent: tenantId is NULLABLE - system events may have no tenant.
--   Policy: NULL tenantId is always accessible to system (bypass) only.
--   Tenant context: tenantId = current_tenant_id (skips NULL rows naturally).
-- Recovery tables: accessed via prismaAdmin which must bypass RLS.
-- AITool: NO tenantId - global registry. EXCLUDED.
-- Tenant: Root identity table. EXCLUDED (auth edge manages this).
-- TenantBootstrap: System provisioning. EXCLUDED.
-- Permission: Global enum table, no tenantId. EXCLUDED.
-- =============================================================================

-- ==========================================
-- IDENTITY & ACCESS
-- ==========================================

-- Role (tenantId: YES, system access needed during onboarding via executeAsSystem)
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_role" ON "Role";
CREATE POLICY "tenant_isolation_role" ON "Role"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- UserRole (tenantId: YES, junction between User and Role)
-- Category B: Requires relational policy. tenantId alone is insufficient because an attacker
-- can INSERT tenantId=ownTenant + roleId from another tenant. The WITH CHECK subquery
-- enforces that the referenced role also belongs to the same tenant.
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_user_role" ON "UserRole";
CREATE POLICY "tenant_isolation_user_role" ON "UserRole"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR (
      "tenantId" = current_setting('app.current_tenant_id', true)::text
      AND EXISTS (
        SELECT 1 FROM "Role" r
        WHERE r.id = "roleId"
        AND r."tenantId" = current_setting('app.current_tenant_id', true)::text
      )
    )
  );

-- RolePermission (tenantId: YES, junction between Role and Permission)
-- Category B: Relational policy required. Ensures the referenced role belongs to this tenant.
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_role_permission" ON "RolePermission";
CREATE POLICY "tenant_isolation_role_permission" ON "RolePermission"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR (
      "tenantId" = current_setting('app.current_tenant_id', true)::text
      AND EXISTS (
        SELECT 1 FROM "Role" r
        WHERE r.id = "roleId"
        AND r."tenantId" = current_setting('app.current_tenant_id', true)::text
      )
    )
  );

-- UserPresence (tenantId: YES, realtime status)
ALTER TABLE "UserPresence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPresence" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_user_presence" ON "UserPresence";
CREATE POLICY "tenant_isolation_user_presence" ON "UserPresence"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- DeviceSession (tenantId: YES, per-user per-tenant session)
ALTER TABLE "DeviceSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceSession" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_device_session" ON "DeviceSession";
CREATE POLICY "tenant_isolation_device_session" ON "DeviceSession"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- Department (tenantId: YES, organizational unit)
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_department" ON "Department";
CREATE POLICY "tenant_isolation_department" ON "Department"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- COMMUNICATIONS
-- ==========================================

-- CallLog (tenantId: YES, Twilio webhooks resolve tenantId from CallSid->CallLog)
ALTER TABLE "CallLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_call_log" ON "CallLog";
CREATE POLICY "tenant_isolation_call_log" ON "CallLog"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ChatConversation
ALTER TABLE "ChatConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatConversation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_chat_conversation" ON "ChatConversation";
CREATE POLICY "tenant_isolation_chat_conversation" ON "ChatConversation"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ChatParticipant
ALTER TABLE "ChatParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatParticipant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_chat_participant" ON "ChatParticipant";
CREATE POLICY "tenant_isolation_chat_participant" ON "ChatParticipant"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR (
      "tenantId" = current_setting('app.current_tenant_id', true)::text
      AND EXISTS (
        SELECT 1 FROM "ChatConversation" c
        WHERE c.id = "conversationId"
        AND c."tenantId" = current_setting('app.current_tenant_id', true)::text
      )
    )
  );

-- ChatMessage
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_chat_message" ON "ChatMessage";
CREATE POLICY "tenant_isolation_chat_message" ON "ChatMessage"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ChatReadReceipt
ALTER TABLE "ChatReadReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatReadReceipt" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_chat_read_receipt" ON "ChatReadReceipt";
CREATE POLICY "tenant_isolation_chat_read_receipt" ON "ChatReadReceipt"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- MailThread
ALTER TABLE "MailThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailThread" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_mail_thread" ON "MailThread";
CREATE POLICY "tenant_isolation_mail_thread" ON "MailThread"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- MailRecipient
ALTER TABLE "MailRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailRecipient" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_mail_recipient" ON "MailRecipient";
CREATE POLICY "tenant_isolation_mail_recipient" ON "MailRecipient"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- MailMessage
ALTER TABLE "MailMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailMessage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_mail_message" ON "MailMessage";
CREATE POLICY "tenant_isolation_mail_message" ON "MailMessage"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- MailDraft
ALTER TABLE "MailDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailDraft" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_mail_draft" ON "MailDraft";
CREATE POLICY "tenant_isolation_mail_draft" ON "MailDraft"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- CommunicationAttachment
ALTER TABLE "CommunicationAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommunicationAttachment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_comm_attachment" ON "CommunicationAttachment";
CREATE POLICY "tenant_isolation_comm_attachment" ON "CommunicationAttachment"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- Meeting
ALTER TABLE "Meeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Meeting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_meeting" ON "Meeting";
CREATE POLICY "tenant_isolation_meeting" ON "Meeting"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- MeetingParticipant
ALTER TABLE "MeetingParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingParticipant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_meeting_participant" ON "MeetingParticipant";
CREATE POLICY "tenant_isolation_meeting_participant" ON "MeetingParticipant"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- CCTV / PHYSICAL SECURITY
-- ==========================================

-- Camera
ALTER TABLE "Camera" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Camera" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_camera" ON "Camera";
CREATE POLICY "tenant_isolation_camera" ON "Camera"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- CameraCredential
ALTER TABLE "CameraCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraCredential" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_camera_credential" ON "CameraCredential";
CREATE POLICY "tenant_isolation_camera_credential" ON "CameraCredential"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- CameraStream
ALTER TABLE "CameraStream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraStream" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_camera_stream" ON "CameraStream";
CREATE POLICY "tenant_isolation_camera_stream" ON "CameraStream"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- Recording
ALTER TABLE "Recording" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recording" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_recording" ON "Recording";
CREATE POLICY "tenant_isolation_recording" ON "Recording"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- CameraEvent
ALTER TABLE "CameraEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_camera_event" ON "CameraEvent";
CREATE POLICY "tenant_isolation_camera_event" ON "CameraEvent"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- Location
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_location" ON "Location";
CREATE POLICY "tenant_isolation_location" ON "Location"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- Incident
ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Incident" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_incident" ON "Incident";
CREATE POLICY "tenant_isolation_incident" ON "Incident"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- AI & INTEGRATIONS
-- ==========================================

-- AIEvent
ALTER TABLE "AIEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_ai_event" ON "AIEvent";
CREATE POLICY "tenant_isolation_ai_event" ON "AIEvent"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- TenantIntegration
ALTER TABLE "TenantIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantIntegration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_tenant_integration" ON "TenantIntegration";
CREATE POLICY "tenant_isolation_tenant_integration" ON "TenantIntegration"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- WebhookEvent: tenantId is NULLABLE. A NULL tenantId row (e.g. Clerk auth events)
-- can only be seen/modified by system operations (bypass_rls).
-- Tenant-scoped requests see only their own rows OR bypass is on.
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_webhook_event" ON "WebhookEvent";
CREATE POLICY "tenant_isolation_webhook_event" ON "WebhookEvent"
  FOR ALL
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR ("tenantId" IS NOT NULL AND "tenantId" = current_setting('app.current_tenant_id', true)::text)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR ("tenantId" IS NOT NULL AND "tenantId" = current_setting('app.current_tenant_id', true)::text)
  );

-- SecurityEvent
ALTER TABLE "SecurityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_security_event" ON "SecurityEvent";
CREATE POLICY "tenant_isolation_security_event" ON "SecurityEvent"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- DocumentPermission
ALTER TABLE "DocumentPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentPermission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_document_permission" ON "DocumentPermission";
CREATE POLICY "tenant_isolation_document_permission" ON "DocumentPermission"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- CRM / GENERAL
-- ==========================================

-- CRMComment
ALTER TABLE "CRMComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CRMComment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_crm_comment" ON "CRMComment";
CREATE POLICY "tenant_isolation_crm_comment" ON "CRMComment"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ActivityTimeline
ALTER TABLE "ActivityTimeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityTimeline" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_activity_timeline" ON "ActivityTimeline";
CREATE POLICY "tenant_isolation_activity_timeline" ON "ActivityTimeline"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- DemoStorage
ALTER TABLE "DemoStorage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DemoStorage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_demo_storage" ON "DemoStorage";
CREATE POLICY "tenant_isolation_demo_storage" ON "DemoStorage"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- Notification
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_notification" ON "Notification";
CREATE POLICY "tenant_isolation_notification" ON "Notification"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- NotificationPreference
ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_notification_pref" ON "NotificationPreference";
CREATE POLICY "tenant_isolation_notification_pref" ON "NotificationPreference"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- RECOVERY / DATA (accessed via prismaAdmin which sets bypass_rls)
-- ==========================================

-- RecoveryJob (intentionally no Tenant FK to avoid cascade loops per schema comment)
ALTER TABLE "RecoveryJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_recovery_job" ON "RecoveryJob";
CREATE POLICY "tenant_isolation_recovery_job" ON "RecoveryJob"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- RecoverySnapshot
ALTER TABLE "RecoverySnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoverySnapshot" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_recovery_snapshot" ON "RecoverySnapshot";
CREATE POLICY "tenant_isolation_recovery_snapshot" ON "RecoverySnapshot"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- RecoveryAuditLog
ALTER TABLE "RecoveryAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryAuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_recovery_audit_log" ON "RecoveryAuditLog";
CREATE POLICY "tenant_isolation_recovery_audit_log" ON "RecoveryAuditLog"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- RestoreCheckpoint
ALTER TABLE "RestoreCheckpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestoreCheckpoint" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_restore_checkpoint" ON "RestoreCheckpoint";
CREATE POLICY "tenant_isolation_restore_checkpoint" ON "RestoreCheckpoint"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- SALES / FINANCE
-- ==========================================

-- Pipeline
ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pipeline" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_pipeline" ON "Pipeline";
CREATE POLICY "tenant_isolation_pipeline" ON "Pipeline"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- PipelineStage
ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_pipeline_stage" ON "PipelineStage";
CREATE POLICY "tenant_isolation_pipeline_stage" ON "PipelineStage"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- DealStageHistory
ALTER TABLE "DealStageHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealStageHistory" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_deal_stage_history" ON "DealStageHistory";
CREATE POLICY "tenant_isolation_deal_stage_history" ON "DealStageHistory"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- EventOutbox (system cron uses executeAsSystem to scan cross-tenant; per-tenant mutations use withTenant)
ALTER TABLE "EventOutbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventOutbox" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_event_outbox" ON "EventOutbox";
CREATE POLICY "tenant_isolation_event_outbox" ON "EventOutbox"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- Subscription (deprecated but retained for schema compatibility; still tenant-owned)
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_subscription" ON "Subscription";
CREATE POLICY "tenant_isolation_subscription" ON "Subscription"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');

-- Invoice (deprecated but retained for schema compatibility; still tenant-owned)
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_invoice" ON "Invoice";
CREATE POLICY "tenant_isolation_invoice" ON "Invoice"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'on');
