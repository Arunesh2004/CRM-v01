-- DESIGN ARTIFACTS - NOT SAFE TO EXECUTE UNTIL SCHEMA PARITY IS ESTABLISHED.  
-- DESIGN ONLY
-- DO NOT EXECUTE
-- PHASE 4B
-- RLS migration has NOT been approved for deployment

-- ==========================================
-- POLICY FOR Meeting
-- ==========================================
ALTER TABLE "Meeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Meeting" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_meeting" ON "Meeting"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_meeting" ON "Meeting"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_meeting" ON "Meeting"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_meeting" ON "Meeting"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR MeetingParticipant
-- ==========================================
ALTER TABLE "MeetingParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingParticipant" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_meetingparticipant" ON "MeetingParticipant"
FOR SELECT USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "Meeting" p
    WHERE p.id = "meetingId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_meetingparticipant" ON "MeetingParticipant"
FOR INSERT WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "Meeting" p
    WHERE p.id = "meetingId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_meetingparticipant" ON "MeetingParticipant"
FOR UPDATE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "Meeting" p
    WHERE p.id = "meetingId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "Meeting" p
    WHERE p.id = "meetingId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_meetingparticipant" ON "MeetingParticipant"
FOR DELETE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "Meeting" p
    WHERE p.id = "meetingId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ChatConversation
-- ==========================================
ALTER TABLE "ChatConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatConversation" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_chatconversation" ON "ChatConversation"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_chatconversation" ON "ChatConversation"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_chatconversation" ON "ChatConversation"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_chatconversation" ON "ChatConversation"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ChatParticipant
-- ==========================================
ALTER TABLE "ChatParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatParticipant" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_chatparticipant" ON "ChatParticipant"
FOR SELECT USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_chatparticipant" ON "ChatParticipant"
FOR INSERT WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_chatparticipant" ON "ChatParticipant"
FOR UPDATE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_chatparticipant" ON "ChatParticipant"
FOR DELETE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ChatMessage
-- ==========================================
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_chatmessage" ON "ChatMessage"
FOR SELECT USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_chatmessage" ON "ChatMessage"
FOR INSERT WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_chatmessage" ON "ChatMessage"
FOR UPDATE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_chatmessage" ON "ChatMessage"
FOR DELETE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatConversation" p
    WHERE p.id = "conversationId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ChatReadReceipt
-- ==========================================
ALTER TABLE "ChatReadReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatReadReceipt" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_chatreadreceipt" ON "ChatReadReceipt"
FOR SELECT USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_chatreadreceipt" ON "ChatReadReceipt"
FOR INSERT WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_chatreadreceipt" ON "ChatReadReceipt"
FOR UPDATE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_chatreadreceipt" ON "ChatReadReceipt"
FOR DELETE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "ChatMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR MailThread
-- ==========================================
ALTER TABLE "MailThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailThread" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_mailthread" ON "MailThread"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_mailthread" ON "MailThread"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_mailthread" ON "MailThread"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_mailthread" ON "MailThread"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR MailRecipient
-- ==========================================
ALTER TABLE "MailRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailRecipient" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_mailrecipient" ON "MailRecipient"
FOR SELECT USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "MailMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_mailrecipient" ON "MailRecipient"
FOR INSERT WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "MailMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_mailrecipient" ON "MailRecipient"
FOR UPDATE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "MailMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "MailMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_mailrecipient" ON "MailRecipient"
FOR DELETE USING (
  ( "tenantId" = current_setting('app.current_tenant_id', true)::text AND EXISTS (
    SELECT 1 FROM "MailMessage" p
    WHERE p.id = "messageId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR MailMessage
-- ==========================================
ALTER TABLE "MailMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailMessage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_mailmessage" ON "MailMessage"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_mailmessage" ON "MailMessage"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_mailmessage" ON "MailMessage"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_mailmessage" ON "MailMessage"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR MailDraft
-- ==========================================
ALTER TABLE "MailDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailDraft" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_maildraft" ON "MailDraft"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_maildraft" ON "MailDraft"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_maildraft" ON "MailDraft"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_maildraft" ON "MailDraft"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR CallLog
-- ==========================================
ALTER TABLE "CallLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_calllog" ON "CallLog"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_calllog" ON "CallLog"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_calllog" ON "CallLog"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_calllog" ON "CallLog"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

