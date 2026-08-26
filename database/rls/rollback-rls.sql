-- ROLLBACK SCRIPT FOR PHASE 6 RLS MIGRATION
-- DO NOT EXECUTE UNLESS MIGRATION FAILS OR REQUIRES REVERSION

-- Rollback for TenantBootstrap
DROP POLICY IF EXISTS "tenant_isolation_select_tenantbootstrap" ON "TenantBootstrap";
DROP POLICY IF EXISTS "tenant_isolation_insert_tenantbootstrap" ON "TenantBootstrap";
DROP POLICY IF EXISTS "tenant_isolation_update_tenantbootstrap" ON "TenantBootstrap";
DROP POLICY IF EXISTS "tenant_isolation_delete_tenantbootstrap" ON "TenantBootstrap";
ALTER TABLE "TenantBootstrap" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantBootstrap" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Department
DROP POLICY IF EXISTS "tenant_isolation_select_department" ON "Department";
DROP POLICY IF EXISTS "tenant_isolation_insert_department" ON "Department";
DROP POLICY IF EXISTS "tenant_isolation_update_department" ON "Department";
DROP POLICY IF EXISTS "tenant_isolation_delete_department" ON "Department";
ALTER TABLE "Department" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" NO FORCE ROW LEVEL SECURITY;

-- Rollback for User
DROP POLICY IF EXISTS "tenant_isolation_select_user" ON "User";
DROP POLICY IF EXISTS "tenant_isolation_insert_user" ON "User";
DROP POLICY IF EXISTS "tenant_isolation_update_user" ON "User";
DROP POLICY IF EXISTS "tenant_isolation_delete_user" ON "User";
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "User" NO FORCE ROW LEVEL SECURITY;

-- Rollback for DeviceSession
DROP POLICY IF EXISTS "tenant_isolation_select_devicesession" ON "DeviceSession";
DROP POLICY IF EXISTS "tenant_isolation_insert_devicesession" ON "DeviceSession";
DROP POLICY IF EXISTS "tenant_isolation_update_devicesession" ON "DeviceSession";
DROP POLICY IF EXISTS "tenant_isolation_delete_devicesession" ON "DeviceSession";
ALTER TABLE "DeviceSession" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceSession" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Role
DROP POLICY IF EXISTS "tenant_isolation_select_role" ON "Role";
DROP POLICY IF EXISTS "tenant_isolation_insert_role" ON "Role";
DROP POLICY IF EXISTS "tenant_isolation_update_role" ON "Role";
DROP POLICY IF EXISTS "tenant_isolation_delete_role" ON "Role";
ALTER TABLE "Role" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" NO FORCE ROW LEVEL SECURITY;

-- Rollback for RolePermission
DROP POLICY IF EXISTS "tenant_isolation_select_rolepermission" ON "RolePermission";
DROP POLICY IF EXISTS "tenant_isolation_insert_rolepermission" ON "RolePermission";
DROP POLICY IF EXISTS "tenant_isolation_update_rolepermission" ON "RolePermission";
DROP POLICY IF EXISTS "tenant_isolation_delete_rolepermission" ON "RolePermission";
ALTER TABLE "RolePermission" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" NO FORCE ROW LEVEL SECURITY;

-- Rollback for UserRole
DROP POLICY IF EXISTS "tenant_isolation_select_userrole" ON "UserRole";
DROP POLICY IF EXISTS "tenant_isolation_insert_userrole" ON "UserRole";
DROP POLICY IF EXISTS "tenant_isolation_update_userrole" ON "UserRole";
DROP POLICY IF EXISTS "tenant_isolation_delete_userrole" ON "UserRole";
ALTER TABLE "UserRole" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AuditLog
DROP POLICY IF EXISTS "tenant_isolation_select_auditlog" ON "AuditLog";
DROP POLICY IF EXISTS "tenant_isolation_insert_auditlog" ON "AuditLog";
DROP POLICY IF EXISTS "tenant_isolation_update_auditlog" ON "AuditLog";
DROP POLICY IF EXISTS "tenant_isolation_delete_auditlog" ON "AuditLog";
ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" NO FORCE ROW LEVEL SECURITY;

-- Rollback for TenantIntegration
DROP POLICY IF EXISTS "tenant_isolation_select_tenantintegration" ON "TenantIntegration";
DROP POLICY IF EXISTS "tenant_isolation_insert_tenantintegration" ON "TenantIntegration";
DROP POLICY IF EXISTS "tenant_isolation_update_tenantintegration" ON "TenantIntegration";
DROP POLICY IF EXISTS "tenant_isolation_delete_tenantintegration" ON "TenantIntegration";
ALTER TABLE "TenantIntegration" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantIntegration" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Lead
DROP POLICY IF EXISTS "tenant_isolation_select_lead" ON "Lead";
DROP POLICY IF EXISTS "tenant_isolation_insert_lead" ON "Lead";
DROP POLICY IF EXISTS "tenant_isolation_update_lead" ON "Lead";
DROP POLICY IF EXISTS "tenant_isolation_delete_lead" ON "Lead";
ALTER TABLE "Lead" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Customer
DROP POLICY IF EXISTS "tenant_isolation_select_customer" ON "Customer";
DROP POLICY IF EXISTS "tenant_isolation_insert_customer" ON "Customer";
DROP POLICY IF EXISTS "tenant_isolation_update_customer" ON "Customer";
DROP POLICY IF EXISTS "tenant_isolation_delete_customer" ON "Customer";
ALTER TABLE "Customer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" NO FORCE ROW LEVEL SECURITY;

-- Rollback for CustomerContact
DROP POLICY IF EXISTS "tenant_isolation_select_customercontact" ON "CustomerContact";
DROP POLICY IF EXISTS "tenant_isolation_insert_customercontact" ON "CustomerContact";
DROP POLICY IF EXISTS "tenant_isolation_update_customercontact" ON "CustomerContact";
DROP POLICY IF EXISTS "tenant_isolation_delete_customercontact" ON "CustomerContact";
ALTER TABLE "CustomerContact" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerContact" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Location
DROP POLICY IF EXISTS "tenant_isolation_select_location" ON "Location";
DROP POLICY IF EXISTS "tenant_isolation_insert_location" ON "Location";
DROP POLICY IF EXISTS "tenant_isolation_update_location" ON "Location";
DROP POLICY IF EXISTS "tenant_isolation_delete_location" ON "Location";
ALTER TABLE "Location" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Task
DROP POLICY IF EXISTS "tenant_isolation_select_task" ON "Task";
DROP POLICY IF EXISTS "tenant_isolation_insert_task" ON "Task";
DROP POLICY IF EXISTS "tenant_isolation_update_task" ON "Task";
DROP POLICY IF EXISTS "tenant_isolation_delete_task" ON "Task";
ALTER TABLE "Task" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" NO FORCE ROW LEVEL SECURITY;

-- Rollback for CRMComment
DROP POLICY IF EXISTS "tenant_isolation_select_crmcomment" ON "CRMComment";
DROP POLICY IF EXISTS "tenant_isolation_insert_crmcomment" ON "CRMComment";
DROP POLICY IF EXISTS "tenant_isolation_update_crmcomment" ON "CRMComment";
DROP POLICY IF EXISTS "tenant_isolation_delete_crmcomment" ON "CRMComment";
ALTER TABLE "CRMComment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CRMComment" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ActivityTimeline
DROP POLICY IF EXISTS "tenant_isolation_select_activitytimeline" ON "ActivityTimeline";
DROP POLICY IF EXISTS "tenant_isolation_insert_activitytimeline" ON "ActivityTimeline";
DROP POLICY IF EXISTS "tenant_isolation_update_activitytimeline" ON "ActivityTimeline";
DROP POLICY IF EXISTS "tenant_isolation_delete_activitytimeline" ON "ActivityTimeline";
ALTER TABLE "ActivityTimeline" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityTimeline" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Meeting
DROP POLICY IF EXISTS "tenant_isolation_select_meeting" ON "Meeting";
DROP POLICY IF EXISTS "tenant_isolation_insert_meeting" ON "Meeting";
DROP POLICY IF EXISTS "tenant_isolation_update_meeting" ON "Meeting";
DROP POLICY IF EXISTS "tenant_isolation_delete_meeting" ON "Meeting";
ALTER TABLE "Meeting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Meeting" NO FORCE ROW LEVEL SECURITY;

-- Rollback for MeetingParticipant
DROP POLICY IF EXISTS "tenant_isolation_select_meetingparticipant" ON "MeetingParticipant";
DROP POLICY IF EXISTS "tenant_isolation_insert_meetingparticipant" ON "MeetingParticipant";
DROP POLICY IF EXISTS "tenant_isolation_update_meetingparticipant" ON "MeetingParticipant";
DROP POLICY IF EXISTS "tenant_isolation_delete_meetingparticipant" ON "MeetingParticipant";
ALTER TABLE "MeetingParticipant" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingParticipant" NO FORCE ROW LEVEL SECURITY;

-- Rollback for DemoStorage
DROP POLICY IF EXISTS "tenant_isolation_select_demostorage" ON "DemoStorage";
DROP POLICY IF EXISTS "tenant_isolation_insert_demostorage" ON "DemoStorage";
DROP POLICY IF EXISTS "tenant_isolation_update_demostorage" ON "DemoStorage";
DROP POLICY IF EXISTS "tenant_isolation_delete_demostorage" ON "DemoStorage";
ALTER TABLE "DemoStorage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DemoStorage" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Document
DROP POLICY IF EXISTS "tenant_isolation_select_document" ON "Document";
DROP POLICY IF EXISTS "tenant_isolation_insert_document" ON "Document";
DROP POLICY IF EXISTS "tenant_isolation_update_document" ON "Document";
DROP POLICY IF EXISTS "tenant_isolation_delete_document" ON "Document";
ALTER TABLE "Document" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Notification
DROP POLICY IF EXISTS "tenant_isolation_select_notification" ON "Notification";
DROP POLICY IF EXISTS "tenant_isolation_insert_notification" ON "Notification";
DROP POLICY IF EXISTS "tenant_isolation_update_notification" ON "Notification";
DROP POLICY IF EXISTS "tenant_isolation_delete_notification" ON "Notification";
ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" NO FORCE ROW LEVEL SECURITY;

-- Rollback for NotificationPreference
DROP POLICY IF EXISTS "tenant_isolation_select_notificationpreference" ON "NotificationPreference";
DROP POLICY IF EXISTS "tenant_isolation_insert_notificationpreference" ON "NotificationPreference";
DROP POLICY IF EXISTS "tenant_isolation_update_notificationpreference" ON "NotificationPreference";
DROP POLICY IF EXISTS "tenant_isolation_delete_notificationpreference" ON "NotificationPreference";
ALTER TABLE "NotificationPreference" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Camera
DROP POLICY IF EXISTS "tenant_isolation_select_camera" ON "Camera";
DROP POLICY IF EXISTS "tenant_isolation_insert_camera" ON "Camera";
DROP POLICY IF EXISTS "tenant_isolation_update_camera" ON "Camera";
DROP POLICY IF EXISTS "tenant_isolation_delete_camera" ON "Camera";
ALTER TABLE "Camera" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Camera" NO FORCE ROW LEVEL SECURITY;

-- Rollback for CameraCredential
DROP POLICY IF EXISTS "tenant_isolation_select_cameracredential" ON "CameraCredential";
DROP POLICY IF EXISTS "tenant_isolation_insert_cameracredential" ON "CameraCredential";
DROP POLICY IF EXISTS "tenant_isolation_update_cameracredential" ON "CameraCredential";
DROP POLICY IF EXISTS "tenant_isolation_delete_cameracredential" ON "CameraCredential";
ALTER TABLE "CameraCredential" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraCredential" NO FORCE ROW LEVEL SECURITY;

-- Rollback for CameraStream
DROP POLICY IF EXISTS "tenant_isolation_select_camerastream" ON "CameraStream";
DROP POLICY IF EXISTS "tenant_isolation_insert_camerastream" ON "CameraStream";
DROP POLICY IF EXISTS "tenant_isolation_update_camerastream" ON "CameraStream";
DROP POLICY IF EXISTS "tenant_isolation_delete_camerastream" ON "CameraStream";
ALTER TABLE "CameraStream" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraStream" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Recording
DROP POLICY IF EXISTS "tenant_isolation_select_recording" ON "Recording";
DROP POLICY IF EXISTS "tenant_isolation_insert_recording" ON "Recording";
DROP POLICY IF EXISTS "tenant_isolation_update_recording" ON "Recording";
DROP POLICY IF EXISTS "tenant_isolation_delete_recording" ON "Recording";
ALTER TABLE "Recording" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Recording" NO FORCE ROW LEVEL SECURITY;

-- Rollback for CameraEvent
DROP POLICY IF EXISTS "tenant_isolation_select_cameraevent" ON "CameraEvent";
DROP POLICY IF EXISTS "tenant_isolation_insert_cameraevent" ON "CameraEvent";
DROP POLICY IF EXISTS "tenant_isolation_update_cameraevent" ON "CameraEvent";
DROP POLICY IF EXISTS "tenant_isolation_delete_cameraevent" ON "CameraEvent";
ALTER TABLE "CameraEvent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraEvent" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AIEvent
DROP POLICY IF EXISTS "tenant_isolation_select_aievent" ON "AIEvent";
DROP POLICY IF EXISTS "tenant_isolation_insert_aievent" ON "AIEvent";
DROP POLICY IF EXISTS "tenant_isolation_update_aievent" ON "AIEvent";
DROP POLICY IF EXISTS "tenant_isolation_delete_aievent" ON "AIEvent";
ALTER TABLE "AIEvent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIEvent" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ChatConversation
DROP POLICY IF EXISTS "tenant_isolation_select_chatconversation" ON "ChatConversation";
DROP POLICY IF EXISTS "tenant_isolation_insert_chatconversation" ON "ChatConversation";
DROP POLICY IF EXISTS "tenant_isolation_update_chatconversation" ON "ChatConversation";
DROP POLICY IF EXISTS "tenant_isolation_delete_chatconversation" ON "ChatConversation";
ALTER TABLE "ChatConversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatConversation" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ChatParticipant
DROP POLICY IF EXISTS "tenant_isolation_select_chatparticipant" ON "ChatParticipant";
DROP POLICY IF EXISTS "tenant_isolation_insert_chatparticipant" ON "ChatParticipant";
DROP POLICY IF EXISTS "tenant_isolation_update_chatparticipant" ON "ChatParticipant";
DROP POLICY IF EXISTS "tenant_isolation_delete_chatparticipant" ON "ChatParticipant";
ALTER TABLE "ChatParticipant" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatParticipant" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ChatMessage
DROP POLICY IF EXISTS "tenant_isolation_select_chatmessage" ON "ChatMessage";
DROP POLICY IF EXISTS "tenant_isolation_insert_chatmessage" ON "ChatMessage";
DROP POLICY IF EXISTS "tenant_isolation_update_chatmessage" ON "ChatMessage";
DROP POLICY IF EXISTS "tenant_isolation_delete_chatmessage" ON "ChatMessage";
ALTER TABLE "ChatMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ChatReadReceipt
DROP POLICY IF EXISTS "tenant_isolation_select_chatreadreceipt" ON "ChatReadReceipt";
DROP POLICY IF EXISTS "tenant_isolation_insert_chatreadreceipt" ON "ChatReadReceipt";
DROP POLICY IF EXISTS "tenant_isolation_update_chatreadreceipt" ON "ChatReadReceipt";
DROP POLICY IF EXISTS "tenant_isolation_delete_chatreadreceipt" ON "ChatReadReceipt";
ALTER TABLE "ChatReadReceipt" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatReadReceipt" NO FORCE ROW LEVEL SECURITY;

-- Rollback for MailThread
DROP POLICY IF EXISTS "tenant_isolation_select_mailthread" ON "MailThread";
DROP POLICY IF EXISTS "tenant_isolation_insert_mailthread" ON "MailThread";
DROP POLICY IF EXISTS "tenant_isolation_update_mailthread" ON "MailThread";
DROP POLICY IF EXISTS "tenant_isolation_delete_mailthread" ON "MailThread";
ALTER TABLE "MailThread" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MailThread" NO FORCE ROW LEVEL SECURITY;

-- Rollback for MailRecipient
DROP POLICY IF EXISTS "tenant_isolation_select_mailrecipient" ON "MailRecipient";
DROP POLICY IF EXISTS "tenant_isolation_insert_mailrecipient" ON "MailRecipient";
DROP POLICY IF EXISTS "tenant_isolation_update_mailrecipient" ON "MailRecipient";
DROP POLICY IF EXISTS "tenant_isolation_delete_mailrecipient" ON "MailRecipient";
ALTER TABLE "MailRecipient" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MailRecipient" NO FORCE ROW LEVEL SECURITY;

-- Rollback for MailMessage
DROP POLICY IF EXISTS "tenant_isolation_select_mailmessage" ON "MailMessage";
DROP POLICY IF EXISTS "tenant_isolation_insert_mailmessage" ON "MailMessage";
DROP POLICY IF EXISTS "tenant_isolation_update_mailmessage" ON "MailMessage";
DROP POLICY IF EXISTS "tenant_isolation_delete_mailmessage" ON "MailMessage";
ALTER TABLE "MailMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MailMessage" NO FORCE ROW LEVEL SECURITY;

-- Rollback for MailDraft
DROP POLICY IF EXISTS "tenant_isolation_select_maildraft" ON "MailDraft";
DROP POLICY IF EXISTS "tenant_isolation_insert_maildraft" ON "MailDraft";
DROP POLICY IF EXISTS "tenant_isolation_update_maildraft" ON "MailDraft";
DROP POLICY IF EXISTS "tenant_isolation_delete_maildraft" ON "MailDraft";
ALTER TABLE "MailDraft" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MailDraft" NO FORCE ROW LEVEL SECURITY;

-- Rollback for CommunicationAttachment
DROP POLICY IF EXISTS "tenant_isolation_select_communicationattachment" ON "CommunicationAttachment";
DROP POLICY IF EXISTS "tenant_isolation_insert_communicationattachment" ON "CommunicationAttachment";
DROP POLICY IF EXISTS "tenant_isolation_update_communicationattachment" ON "CommunicationAttachment";
DROP POLICY IF EXISTS "tenant_isolation_delete_communicationattachment" ON "CommunicationAttachment";
ALTER TABLE "CommunicationAttachment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CommunicationAttachment" NO FORCE ROW LEVEL SECURITY;

-- Rollback for CallLog
DROP POLICY IF EXISTS "tenant_isolation_select_calllog" ON "CallLog";
DROP POLICY IF EXISTS "tenant_isolation_insert_calllog" ON "CallLog";
DROP POLICY IF EXISTS "tenant_isolation_update_calllog" ON "CallLog";
DROP POLICY IF EXISTS "tenant_isolation_delete_calllog" ON "CallLog";
ALTER TABLE "CallLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CallLog" NO FORCE ROW LEVEL SECURITY;

-- Rollback for UserPresence
DROP POLICY IF EXISTS "tenant_isolation_select_userpresence" ON "UserPresence";
DROP POLICY IF EXISTS "tenant_isolation_insert_userpresence" ON "UserPresence";
DROP POLICY IF EXISTS "tenant_isolation_update_userpresence" ON "UserPresence";
DROP POLICY IF EXISTS "tenant_isolation_delete_userpresence" ON "UserPresence";
ALTER TABLE "UserPresence" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPresence" NO FORCE ROW LEVEL SECURITY;

-- Rollback for WebhookEvent
DROP POLICY IF EXISTS "tenant_isolation_select_webhookevent" ON "WebhookEvent";
DROP POLICY IF EXISTS "tenant_isolation_insert_webhookevent" ON "WebhookEvent";
DROP POLICY IF EXISTS "tenant_isolation_update_webhookevent" ON "WebhookEvent";
DROP POLICY IF EXISTS "tenant_isolation_delete_webhookevent" ON "WebhookEvent";
ALTER TABLE "WebhookEvent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Incident
DROP POLICY IF EXISTS "tenant_isolation_select_incident" ON "Incident";
DROP POLICY IF EXISTS "tenant_isolation_insert_incident" ON "Incident";
DROP POLICY IF EXISTS "tenant_isolation_update_incident" ON "Incident";
DROP POLICY IF EXISTS "tenant_isolation_delete_incident" ON "Incident";
ALTER TABLE "Incident" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Incident" NO FORCE ROW LEVEL SECURITY;

-- Rollback for RecoveryJob
DROP POLICY IF EXISTS "tenant_isolation_select_recoveryjob" ON "RecoveryJob";
DROP POLICY IF EXISTS "tenant_isolation_insert_recoveryjob" ON "RecoveryJob";
DROP POLICY IF EXISTS "tenant_isolation_update_recoveryjob" ON "RecoveryJob";
DROP POLICY IF EXISTS "tenant_isolation_delete_recoveryjob" ON "RecoveryJob";
ALTER TABLE "RecoveryJob" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryJob" NO FORCE ROW LEVEL SECURITY;

-- Rollback for RecoverySnapshot
DROP POLICY IF EXISTS "tenant_isolation_select_recoverysnapshot" ON "RecoverySnapshot";
DROP POLICY IF EXISTS "tenant_isolation_insert_recoverysnapshot" ON "RecoverySnapshot";
DROP POLICY IF EXISTS "tenant_isolation_update_recoverysnapshot" ON "RecoverySnapshot";
DROP POLICY IF EXISTS "tenant_isolation_delete_recoverysnapshot" ON "RecoverySnapshot";
ALTER TABLE "RecoverySnapshot" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoverySnapshot" NO FORCE ROW LEVEL SECURITY;

-- Rollback for RecoveryAuditLog
DROP POLICY IF EXISTS "tenant_isolation_select_recoveryauditlog" ON "RecoveryAuditLog";
DROP POLICY IF EXISTS "tenant_isolation_insert_recoveryauditlog" ON "RecoveryAuditLog";
DROP POLICY IF EXISTS "tenant_isolation_update_recoveryauditlog" ON "RecoveryAuditLog";
DROP POLICY IF EXISTS "tenant_isolation_delete_recoveryauditlog" ON "RecoveryAuditLog";
ALTER TABLE "RecoveryAuditLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryAuditLog" NO FORCE ROW LEVEL SECURITY;

-- Rollback for RestoreCheckpoint
DROP POLICY IF EXISTS "tenant_isolation_select_restorecheckpoint" ON "RestoreCheckpoint";
DROP POLICY IF EXISTS "tenant_isolation_insert_restorecheckpoint" ON "RestoreCheckpoint";
DROP POLICY IF EXISTS "tenant_isolation_update_restorecheckpoint" ON "RestoreCheckpoint";
DROP POLICY IF EXISTS "tenant_isolation_delete_restorecheckpoint" ON "RestoreCheckpoint";
ALTER TABLE "RestoreCheckpoint" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RestoreCheckpoint" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Pipeline
DROP POLICY IF EXISTS "tenant_isolation_select_pipeline" ON "Pipeline";
DROP POLICY IF EXISTS "tenant_isolation_insert_pipeline" ON "Pipeline";
DROP POLICY IF EXISTS "tenant_isolation_update_pipeline" ON "Pipeline";
DROP POLICY IF EXISTS "tenant_isolation_delete_pipeline" ON "Pipeline";
ALTER TABLE "Pipeline" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Pipeline" NO FORCE ROW LEVEL SECURITY;

-- Rollback for PipelineStage
DROP POLICY IF EXISTS "tenant_isolation_select_pipelinestage" ON "PipelineStage";
DROP POLICY IF EXISTS "tenant_isolation_insert_pipelinestage" ON "PipelineStage";
DROP POLICY IF EXISTS "tenant_isolation_update_pipelinestage" ON "PipelineStage";
DROP POLICY IF EXISTS "tenant_isolation_delete_pipelinestage" ON "PipelineStage";
ALTER TABLE "PipelineStage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Deal
DROP POLICY IF EXISTS "tenant_isolation_select_deal" ON "Deal";
DROP POLICY IF EXISTS "tenant_isolation_insert_deal" ON "Deal";
DROP POLICY IF EXISTS "tenant_isolation_update_deal" ON "Deal";
DROP POLICY IF EXISTS "tenant_isolation_delete_deal" ON "Deal";
ALTER TABLE "Deal" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" NO FORCE ROW LEVEL SECURITY;

-- Rollback for DealStageHistory
DROP POLICY IF EXISTS "tenant_isolation_select_dealstagehistory" ON "DealStageHistory";
DROP POLICY IF EXISTS "tenant_isolation_insert_dealstagehistory" ON "DealStageHistory";
DROP POLICY IF EXISTS "tenant_isolation_update_dealstagehistory" ON "DealStageHistory";
DROP POLICY IF EXISTS "tenant_isolation_delete_dealstagehistory" ON "DealStageHistory";
ALTER TABLE "DealStageHistory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DealStageHistory" NO FORCE ROW LEVEL SECURITY;

-- Rollback for EventOutbox
DROP POLICY IF EXISTS "tenant_isolation_select_eventoutbox" ON "EventOutbox";
DROP POLICY IF EXISTS "tenant_isolation_insert_eventoutbox" ON "EventOutbox";
DROP POLICY IF EXISTS "tenant_isolation_update_eventoutbox" ON "EventOutbox";
DROP POLICY IF EXISTS "tenant_isolation_delete_eventoutbox" ON "EventOutbox";
ALTER TABLE "EventOutbox" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "EventOutbox" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AIConversation
DROP POLICY IF EXISTS "tenant_isolation_select_aiconversation" ON "AIConversation";
DROP POLICY IF EXISTS "tenant_isolation_insert_aiconversation" ON "AIConversation";
DROP POLICY IF EXISTS "tenant_isolation_update_aiconversation" ON "AIConversation";
DROP POLICY IF EXISTS "tenant_isolation_delete_aiconversation" ON "AIConversation";
ALTER TABLE "AIConversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIConversation" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AIConversationMessage
DROP POLICY IF EXISTS "tenant_isolation_select_aiconversationmessage" ON "AIConversationMessage";
DROP POLICY IF EXISTS "tenant_isolation_insert_aiconversationmessage" ON "AIConversationMessage";
DROP POLICY IF EXISTS "tenant_isolation_update_aiconversationmessage" ON "AIConversationMessage";
DROP POLICY IF EXISTS "tenant_isolation_delete_aiconversationmessage" ON "AIConversationMessage";
ALTER TABLE "AIConversationMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIConversationMessage" NO FORCE ROW LEVEL SECURITY;

-- Rollback for SecurityEvent
DROP POLICY IF EXISTS "tenant_isolation_select_securityevent" ON "SecurityEvent";
DROP POLICY IF EXISTS "tenant_isolation_insert_securityevent" ON "SecurityEvent";
DROP POLICY IF EXISTS "tenant_isolation_update_securityevent" ON "SecurityEvent";
DROP POLICY IF EXISTS "tenant_isolation_delete_securityevent" ON "SecurityEvent";
ALTER TABLE "SecurityEvent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AIExecution
DROP POLICY IF EXISTS "tenant_isolation_select_aiexecution" ON "AIExecution";
DROP POLICY IF EXISTS "tenant_isolation_insert_aiexecution" ON "AIExecution";
DROP POLICY IF EXISTS "tenant_isolation_update_aiexecution" ON "AIExecution";
DROP POLICY IF EXISTS "tenant_isolation_delete_aiexecution" ON "AIExecution";
ALTER TABLE "AIExecution" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIExecution" NO FORCE ROW LEVEL SECURITY;

-- Rollback for DocumentEmbedding
DROP POLICY IF EXISTS "tenant_isolation_select_documentembedding" ON "DocumentEmbedding";
DROP POLICY IF EXISTS "tenant_isolation_insert_documentembedding" ON "DocumentEmbedding";
DROP POLICY IF EXISTS "tenant_isolation_update_documentembedding" ON "DocumentEmbedding";
DROP POLICY IF EXISTS "tenant_isolation_delete_documentembedding" ON "DocumentEmbedding";
ALTER TABLE "DocumentEmbedding" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentEmbedding" NO FORCE ROW LEVEL SECURITY;

-- Rollback for DocumentPermission
DROP POLICY IF EXISTS "tenant_isolation_select_documentpermission" ON "DocumentPermission";
DROP POLICY IF EXISTS "tenant_isolation_insert_documentpermission" ON "DocumentPermission";
DROP POLICY IF EXISTS "tenant_isolation_update_documentpermission" ON "DocumentPermission";
DROP POLICY IF EXISTS "tenant_isolation_delete_documentpermission" ON "DocumentPermission";
ALTER TABLE "DocumentPermission" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentPermission" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AIMemory
DROP POLICY IF EXISTS "tenant_isolation_select_aimemory" ON "AIMemory";
DROP POLICY IF EXISTS "tenant_isolation_insert_aimemory" ON "AIMemory";
DROP POLICY IF EXISTS "tenant_isolation_update_aimemory" ON "AIMemory";
DROP POLICY IF EXISTS "tenant_isolation_delete_aimemory" ON "AIMemory";
ALTER TABLE "AIMemory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIMemory" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AIAgentExecution
DROP POLICY IF EXISTS "tenant_isolation_select_aiagentexecution" ON "AIAgentExecution";
DROP POLICY IF EXISTS "tenant_isolation_insert_aiagentexecution" ON "AIAgentExecution";
DROP POLICY IF EXISTS "tenant_isolation_update_aiagentexecution" ON "AIAgentExecution";
DROP POLICY IF EXISTS "tenant_isolation_delete_aiagentexecution" ON "AIAgentExecution";
ALTER TABLE "AIAgentExecution" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIAgentExecution" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AIReference
DROP POLICY IF EXISTS "tenant_isolation_select_aireference" ON "AIReference";
DROP POLICY IF EXISTS "tenant_isolation_insert_aireference" ON "AIReference";
DROP POLICY IF EXISTS "tenant_isolation_update_aireference" ON "AIReference";
DROP POLICY IF EXISTS "tenant_isolation_delete_aireference" ON "AIReference";
ALTER TABLE "AIReference" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIReference" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AIProviderConfig
DROP POLICY IF EXISTS "tenant_isolation_select_aiproviderconfig" ON "AIProviderConfig";
DROP POLICY IF EXISTS "tenant_isolation_insert_aiproviderconfig" ON "AIProviderConfig";
DROP POLICY IF EXISTS "tenant_isolation_update_aiproviderconfig" ON "AIProviderConfig";
DROP POLICY IF EXISTS "tenant_isolation_delete_aiproviderconfig" ON "AIProviderConfig";
ALTER TABLE "AIProviderConfig" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIProviderConfig" NO FORCE ROW LEVEL SECURITY;

-- Rollback for AITokenUsage
DROP POLICY IF EXISTS "tenant_isolation_select_aitokenusage" ON "AITokenUsage";
DROP POLICY IF EXISTS "tenant_isolation_insert_aitokenusage" ON "AITokenUsage";
DROP POLICY IF EXISTS "tenant_isolation_update_aitokenusage" ON "AITokenUsage";
DROP POLICY IF EXISTS "tenant_isolation_delete_aitokenusage" ON "AITokenUsage";
ALTER TABLE "AITokenUsage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AITokenUsage" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Workflow
DROP POLICY IF EXISTS "tenant_isolation_select_workflow" ON "Workflow";
DROP POLICY IF EXISTS "tenant_isolation_insert_workflow" ON "Workflow";
DROP POLICY IF EXISTS "tenant_isolation_update_workflow" ON "Workflow";
DROP POLICY IF EXISTS "tenant_isolation_delete_workflow" ON "Workflow";
ALTER TABLE "Workflow" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Workflow" NO FORCE ROW LEVEL SECURITY;

-- Rollback for WorkflowTrigger
DROP POLICY IF EXISTS "tenant_isolation_select_workflowtrigger" ON "WorkflowTrigger";
DROP POLICY IF EXISTS "tenant_isolation_insert_workflowtrigger" ON "WorkflowTrigger";
DROP POLICY IF EXISTS "tenant_isolation_update_workflowtrigger" ON "WorkflowTrigger";
DROP POLICY IF EXISTS "tenant_isolation_delete_workflowtrigger" ON "WorkflowTrigger";
ALTER TABLE "WorkflowTrigger" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowTrigger" NO FORCE ROW LEVEL SECURITY;

-- Rollback for WorkflowAction
DROP POLICY IF EXISTS "tenant_isolation_select_workflowaction" ON "WorkflowAction";
DROP POLICY IF EXISTS "tenant_isolation_insert_workflowaction" ON "WorkflowAction";
DROP POLICY IF EXISTS "tenant_isolation_update_workflowaction" ON "WorkflowAction";
DROP POLICY IF EXISTS "tenant_isolation_delete_workflowaction" ON "WorkflowAction";
ALTER TABLE "WorkflowAction" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowAction" NO FORCE ROW LEVEL SECURITY;

-- Rollback for WorkflowExecution
DROP POLICY IF EXISTS "tenant_isolation_select_workflowexecution" ON "WorkflowExecution";
DROP POLICY IF EXISTS "tenant_isolation_insert_workflowexecution" ON "WorkflowExecution";
DROP POLICY IF EXISTS "tenant_isolation_update_workflowexecution" ON "WorkflowExecution";
DROP POLICY IF EXISTS "tenant_isolation_delete_workflowexecution" ON "WorkflowExecution";
ALTER TABLE "WorkflowExecution" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" NO FORCE ROW LEVEL SECURITY;

-- Rollback for WorkflowExecutionStep
DROP POLICY IF EXISTS "tenant_isolation_select_workflowexecutionstep" ON "WorkflowExecutionStep";
DROP POLICY IF EXISTS "tenant_isolation_insert_workflowexecutionstep" ON "WorkflowExecutionStep";
DROP POLICY IF EXISTS "tenant_isolation_update_workflowexecutionstep" ON "WorkflowExecutionStep";
DROP POLICY IF EXISTS "tenant_isolation_delete_workflowexecutionstep" ON "WorkflowExecutionStep";
ALTER TABLE "WorkflowExecutionStep" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecutionStep" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ProductCategory
DROP POLICY IF EXISTS "tenant_isolation_select_productcategory" ON "ProductCategory";
DROP POLICY IF EXISTS "tenant_isolation_insert_productcategory" ON "ProductCategory";
DROP POLICY IF EXISTS "tenant_isolation_update_productcategory" ON "ProductCategory";
DROP POLICY IF EXISTS "tenant_isolation_delete_productcategory" ON "ProductCategory";
ALTER TABLE "ProductCategory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ProductFamily
DROP POLICY IF EXISTS "tenant_isolation_select_productfamily" ON "ProductFamily";
DROP POLICY IF EXISTS "tenant_isolation_insert_productfamily" ON "ProductFamily";
DROP POLICY IF EXISTS "tenant_isolation_update_productfamily" ON "ProductFamily";
DROP POLICY IF EXISTS "tenant_isolation_delete_productfamily" ON "ProductFamily";
ALTER TABLE "ProductFamily" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductFamily" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Product
DROP POLICY IF EXISTS "tenant_isolation_select_product" ON "Product";
DROP POLICY IF EXISTS "tenant_isolation_insert_product" ON "Product";
DROP POLICY IF EXISTS "tenant_isolation_update_product" ON "Product";
DROP POLICY IF EXISTS "tenant_isolation_delete_product" ON "Product";
ALTER TABLE "Product" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" NO FORCE ROW LEVEL SECURITY;

-- Rollback for PriceBook
DROP POLICY IF EXISTS "tenant_isolation_select_pricebook" ON "PriceBook";
DROP POLICY IF EXISTS "tenant_isolation_insert_pricebook" ON "PriceBook";
DROP POLICY IF EXISTS "tenant_isolation_update_pricebook" ON "PriceBook";
DROP POLICY IF EXISTS "tenant_isolation_delete_pricebook" ON "PriceBook";
ALTER TABLE "PriceBook" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBook" NO FORCE ROW LEVEL SECURITY;

-- Rollback for PriceBookEntry
DROP POLICY IF EXISTS "tenant_isolation_select_pricebookentry" ON "PriceBookEntry";
DROP POLICY IF EXISTS "tenant_isolation_insert_pricebookentry" ON "PriceBookEntry";
DROP POLICY IF EXISTS "tenant_isolation_update_pricebookentry" ON "PriceBookEntry";
DROP POLICY IF EXISTS "tenant_isolation_delete_pricebookentry" ON "PriceBookEntry";
ALTER TABLE "PriceBookEntry" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBookEntry" NO FORCE ROW LEVEL SECURITY;

-- Rollback for DiscountRule
DROP POLICY IF EXISTS "tenant_isolation_select_discountrule" ON "DiscountRule";
DROP POLICY IF EXISTS "tenant_isolation_insert_discountrule" ON "DiscountRule";
DROP POLICY IF EXISTS "tenant_isolation_update_discountrule" ON "DiscountRule";
DROP POLICY IF EXISTS "tenant_isolation_delete_discountrule" ON "DiscountRule";
ALTER TABLE "DiscountRule" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscountRule" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Quote
DROP POLICY IF EXISTS "tenant_isolation_select_quote" ON "Quote";
DROP POLICY IF EXISTS "tenant_isolation_insert_quote" ON "Quote";
DROP POLICY IF EXISTS "tenant_isolation_update_quote" ON "Quote";
DROP POLICY IF EXISTS "tenant_isolation_delete_quote" ON "Quote";
ALTER TABLE "Quote" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" NO FORCE ROW LEVEL SECURITY;

-- Rollback for QuoteLineItem
DROP POLICY IF EXISTS "tenant_isolation_select_quotelineitem" ON "QuoteLineItem";
DROP POLICY IF EXISTS "tenant_isolation_insert_quotelineitem" ON "QuoteLineItem";
DROP POLICY IF EXISTS "tenant_isolation_update_quotelineitem" ON "QuoteLineItem";
DROP POLICY IF EXISTS "tenant_isolation_delete_quotelineitem" ON "QuoteLineItem";
ALTER TABLE "QuoteLineItem" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteLineItem" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Territory
DROP POLICY IF EXISTS "tenant_isolation_select_territory" ON "Territory";
DROP POLICY IF EXISTS "tenant_isolation_insert_territory" ON "Territory";
DROP POLICY IF EXISTS "tenant_isolation_update_territory" ON "Territory";
DROP POLICY IF EXISTS "tenant_isolation_delete_territory" ON "Territory";
ALTER TABLE "Territory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Territory" NO FORCE ROW LEVEL SECURITY;

-- Rollback for UserTerritory
DROP POLICY IF EXISTS "tenant_isolation_select_userterritory" ON "UserTerritory";
DROP POLICY IF EXISTS "tenant_isolation_insert_userterritory" ON "UserTerritory";
DROP POLICY IF EXISTS "tenant_isolation_update_userterritory" ON "UserTerritory";
DROP POLICY IF EXISTS "tenant_isolation_delete_userterritory" ON "UserTerritory";
ALTER TABLE "UserTerritory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTerritory" NO FORCE ROW LEVEL SECURITY;

-- Rollback for SalesQuota
DROP POLICY IF EXISTS "tenant_isolation_select_salesquota" ON "SalesQuota";
DROP POLICY IF EXISTS "tenant_isolation_insert_salesquota" ON "SalesQuota";
DROP POLICY IF EXISTS "tenant_isolation_update_salesquota" ON "SalesQuota";
DROP POLICY IF EXISTS "tenant_isolation_delete_salesquota" ON "SalesQuota";
ALTER TABLE "SalesQuota" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesQuota" NO FORCE ROW LEVEL SECURITY;

-- Rollback for DealSnapshot
DROP POLICY IF EXISTS "tenant_isolation_select_dealsnapshot" ON "DealSnapshot";
DROP POLICY IF EXISTS "tenant_isolation_insert_dealsnapshot" ON "DealSnapshot";
DROP POLICY IF EXISTS "tenant_isolation_update_dealsnapshot" ON "DealSnapshot";
DROP POLICY IF EXISTS "tenant_isolation_delete_dealsnapshot" ON "DealSnapshot";
ALTER TABLE "DealSnapshot" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DealSnapshot" NO FORCE ROW LEVEL SECURITY;

-- Rollback for FieldSecurityPolicy
DROP POLICY IF EXISTS "tenant_isolation_select_fieldsecuritypolicy" ON "FieldSecurityPolicy";
DROP POLICY IF EXISTS "tenant_isolation_insert_fieldsecuritypolicy" ON "FieldSecurityPolicy";
DROP POLICY IF EXISTS "tenant_isolation_update_fieldsecuritypolicy" ON "FieldSecurityPolicy";
DROP POLICY IF EXISTS "tenant_isolation_delete_fieldsecuritypolicy" ON "FieldSecurityPolicy";
ALTER TABLE "FieldSecurityPolicy" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldSecurityPolicy" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ABACPolicy
DROP POLICY IF EXISTS "tenant_isolation_select_abacpolicy" ON "ABACPolicy";
DROP POLICY IF EXISTS "tenant_isolation_insert_abacpolicy" ON "ABACPolicy";
DROP POLICY IF EXISTS "tenant_isolation_update_abacpolicy" ON "ABACPolicy";
DROP POLICY IF EXISTS "tenant_isolation_delete_abacpolicy" ON "ABACPolicy";
ALTER TABLE "ABACPolicy" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ABACPolicy" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ApprovalRequest
DROP POLICY IF EXISTS "tenant_isolation_select_approvalrequest" ON "ApprovalRequest";
DROP POLICY IF EXISTS "tenant_isolation_insert_approvalrequest" ON "ApprovalRequest";
DROP POLICY IF EXISTS "tenant_isolation_update_approvalrequest" ON "ApprovalRequest";
DROP POLICY IF EXISTS "tenant_isolation_delete_approvalrequest" ON "ApprovalRequest";
ALTER TABLE "ApprovalRequest" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRequest" NO FORCE ROW LEVEL SECURITY;

-- Rollback for ApprovalStep
DROP POLICY IF EXISTS "tenant_isolation_select_approvalstep" ON "ApprovalStep";
DROP POLICY IF EXISTS "tenant_isolation_insert_approvalstep" ON "ApprovalStep";
DROP POLICY IF EXISTS "tenant_isolation_update_approvalstep" ON "ApprovalStep";
DROP POLICY IF EXISTS "tenant_isolation_delete_approvalstep" ON "ApprovalStep";
ALTER TABLE "ApprovalStep" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalStep" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Ticket
DROP POLICY IF EXISTS "tenant_isolation_select_ticket" ON "Ticket";
DROP POLICY IF EXISTS "tenant_isolation_insert_ticket" ON "Ticket";
DROP POLICY IF EXISTS "tenant_isolation_update_ticket" ON "Ticket";
DROP POLICY IF EXISTS "tenant_isolation_delete_ticket" ON "Ticket";
ALTER TABLE "Ticket" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" NO FORCE ROW LEVEL SECURITY;

-- Rollback for TicketMessage
DROP POLICY IF EXISTS "tenant_isolation_select_ticketmessage" ON "TicketMessage";
DROP POLICY IF EXISTS "tenant_isolation_insert_ticketmessage" ON "TicketMessage";
DROP POLICY IF EXISTS "tenant_isolation_update_ticketmessage" ON "TicketMessage";
DROP POLICY IF EXISTS "tenant_isolation_delete_ticketmessage" ON "TicketMessage";
ALTER TABLE "TicketMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage" NO FORCE ROW LEVEL SECURITY;

-- Rollback for SLAConfiguration
DROP POLICY IF EXISTS "tenant_isolation_select_slaconfiguration" ON "SLAConfiguration";
DROP POLICY IF EXISTS "tenant_isolation_insert_slaconfiguration" ON "SLAConfiguration";
DROP POLICY IF EXISTS "tenant_isolation_update_slaconfiguration" ON "SLAConfiguration";
DROP POLICY IF EXISTS "tenant_isolation_delete_slaconfiguration" ON "SLAConfiguration";
ALTER TABLE "SLAConfiguration" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAConfiguration" NO FORCE ROW LEVEL SECURITY;

-- Rollback for SLAEvent
DROP POLICY IF EXISTS "tenant_isolation_select_slaevent" ON "SLAEvent";
DROP POLICY IF EXISTS "tenant_isolation_insert_slaevent" ON "SLAEvent";
DROP POLICY IF EXISTS "tenant_isolation_update_slaevent" ON "SLAEvent";
DROP POLICY IF EXISTS "tenant_isolation_delete_slaevent" ON "SLAEvent";
ALTER TABLE "SLAEvent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAEvent" NO FORCE ROW LEVEL SECURITY;

-- Rollback for IdempotencyKey
DROP POLICY IF EXISTS "tenant_isolation_select_idempotencykey" ON "IdempotencyKey";
DROP POLICY IF EXISTS "tenant_isolation_insert_idempotencykey" ON "IdempotencyKey";
DROP POLICY IF EXISTS "tenant_isolation_update_idempotencykey" ON "IdempotencyKey";
DROP POLICY IF EXISTS "tenant_isolation_delete_idempotencykey" ON "IdempotencyKey";
ALTER TABLE "IdempotencyKey" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" NO FORCE ROW LEVEL SECURITY;

-- Rollback for DeadLetterQueue
DROP POLICY IF EXISTS "tenant_isolation_select_deadletterqueue" ON "DeadLetterQueue";
DROP POLICY IF EXISTS "tenant_isolation_insert_deadletterqueue" ON "DeadLetterQueue";
DROP POLICY IF EXISTS "tenant_isolation_update_deadletterqueue" ON "DeadLetterQueue";
DROP POLICY IF EXISTS "tenant_isolation_delete_deadletterqueue" ON "DeadLetterQueue";
ALTER TABLE "DeadLetterQueue" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DeadLetterQueue" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Subscription
DROP POLICY IF EXISTS "tenant_isolation_select_subscription" ON "Subscription";
DROP POLICY IF EXISTS "tenant_isolation_insert_subscription" ON "Subscription";
DROP POLICY IF EXISTS "tenant_isolation_update_subscription" ON "Subscription";
DROP POLICY IF EXISTS "tenant_isolation_delete_subscription" ON "Subscription";
ALTER TABLE "Subscription" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" NO FORCE ROW LEVEL SECURITY;

-- Rollback for Invoice
DROP POLICY IF EXISTS "tenant_isolation_select_invoice" ON "Invoice";
DROP POLICY IF EXISTS "tenant_isolation_insert_invoice" ON "Invoice";
DROP POLICY IF EXISTS "tenant_isolation_update_invoice" ON "Invoice";
DROP POLICY IF EXISTS "tenant_isolation_delete_invoice" ON "Invoice";
ALTER TABLE "Invoice" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" NO FORCE ROW LEVEL SECURITY;

