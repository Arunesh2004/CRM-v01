-- DESIGN ARTIFACTS - NOT SAFE TO EXECUTE UNTIL SCHEMA PARITY IS ESTABLISHED.  
-- DESIGN ONLY
-- DO NOT EXECUTE
-- PHASE 4B
-- RLS migration has NOT been approved for deployment

-- ==========================================
-- POLICY FOR AuditLog
-- ==========================================
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_auditlog" ON "AuditLog"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_auditlog" ON "AuditLog"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_auditlog" ON "AuditLog"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_auditlog" ON "AuditLog"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR CameraEvent
-- ==========================================
ALTER TABLE "CameraEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_cameraevent" ON "CameraEvent"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_cameraevent" ON "CameraEvent"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_cameraevent" ON "CameraEvent"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_cameraevent" ON "CameraEvent"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AIEvent
-- ==========================================
ALTER TABLE "AIEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aievent" ON "AIEvent"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aievent" ON "AIEvent"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aievent" ON "AIEvent"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aievent" ON "AIEvent"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR WebhookEvent
-- ==========================================
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_webhookevent" ON "WebhookEvent"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_webhookevent" ON "WebhookEvent"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_webhookevent" ON "WebhookEvent"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_webhookevent" ON "WebhookEvent"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR RecoveryAuditLog
-- ==========================================
ALTER TABLE "RecoveryAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryAuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_recoveryauditlog" ON "RecoveryAuditLog"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_recoveryauditlog" ON "RecoveryAuditLog"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_recoveryauditlog" ON "RecoveryAuditLog"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_recoveryauditlog" ON "RecoveryAuditLog"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR EventOutbox
-- ==========================================
ALTER TABLE "EventOutbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventOutbox" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_eventoutbox" ON "EventOutbox"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_eventoutbox" ON "EventOutbox"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_eventoutbox" ON "EventOutbox"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_eventoutbox" ON "EventOutbox"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AIConversation
-- ==========================================
ALTER TABLE "AIConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIConversation" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aiconversation" ON "AIConversation"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aiconversation" ON "AIConversation"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aiconversation" ON "AIConversation"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aiconversation" ON "AIConversation"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AIConversationMessage
-- ==========================================
ALTER TABLE "AIConversationMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIConversationMessage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aiconversationmessage" ON "AIConversationMessage"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aiconversationmessage" ON "AIConversationMessage"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aiconversationmessage" ON "AIConversationMessage"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aiconversationmessage" ON "AIConversationMessage"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR SecurityEvent
-- ==========================================
ALTER TABLE "SecurityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_securityevent" ON "SecurityEvent"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_securityevent" ON "SecurityEvent"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_securityevent" ON "SecurityEvent"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_securityevent" ON "SecurityEvent"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AIExecution
-- ==========================================
ALTER TABLE "AIExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIExecution" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aiexecution" ON "AIExecution"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aiexecution" ON "AIExecution"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aiexecution" ON "AIExecution"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aiexecution" ON "AIExecution"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AIMemory
-- ==========================================
ALTER TABLE "AIMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIMemory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aimemory" ON "AIMemory"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aimemory" ON "AIMemory"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aimemory" ON "AIMemory"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aimemory" ON "AIMemory"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AIAgentExecution
-- ==========================================
ALTER TABLE "AIAgentExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIAgentExecution" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aiagentexecution" ON "AIAgentExecution"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aiagentexecution" ON "AIAgentExecution"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aiagentexecution" ON "AIAgentExecution"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aiagentexecution" ON "AIAgentExecution"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AIReference
-- ==========================================
ALTER TABLE "AIReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIReference" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aireference" ON "AIReference"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aireference" ON "AIReference"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aireference" ON "AIReference"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aireference" ON "AIReference"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AIProviderConfig
-- ==========================================
ALTER TABLE "AIProviderConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIProviderConfig" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aiproviderconfig" ON "AIProviderConfig"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aiproviderconfig" ON "AIProviderConfig"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aiproviderconfig" ON "AIProviderConfig"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aiproviderconfig" ON "AIProviderConfig"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR AITokenUsage
-- ==========================================
ALTER TABLE "AITokenUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AITokenUsage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_aitokenusage" ON "AITokenUsage"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_aitokenusage" ON "AITokenUsage"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_aitokenusage" ON "AITokenUsage"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_aitokenusage" ON "AITokenUsage"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR SLAEvent
-- ==========================================
ALTER TABLE "SLAEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_slaevent" ON "SLAEvent"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_slaevent" ON "SLAEvent"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_slaevent" ON "SLAEvent"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_slaevent" ON "SLAEvent"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

