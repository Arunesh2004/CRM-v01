CREATE EXTENSION IF NOT EXISTS vector;

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('RLS_VIOLATION_ATTEMPT', 'UNAUTHORIZED_PII_ACCESS', 'AI_BLOCKED_ACTION', 'AI_PERMISSION_FAILURE', 'FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY', 'WEBHOOK_SIGNATURE_FAILURE', 'RATE_LIMIT_TRIGGERED');

-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AIRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AIExecutionStatus" AS ENUM ('PENDING', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ChatConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "ChatParticipantRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MailDraftStatus" AS ENUM ('DRAFT');

-- CreateEnum
CREATE TYPE "CallProvider" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "UserPresenceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'AWAY', 'BUSY');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('CHAT', 'MAIL', 'CALL');

-- CreateEnum
CREATE TYPE "AIMemoryType" AS ENUM ('SHORT_TERM', 'LONG_TERM', 'EPISODIC');

-- CreateEnum
CREATE TYPE "AIMemoryVisibility" AS ENUM ('PRIVATE_USER', 'DEPARTMENT', 'TENANT');

-- CreateEnum
CREATE TYPE "AIAgentExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'WAITING_APPROVAL');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "IncidentStatus" ADD VALUE 'ACKNOWLEDGED';

-- AlterEnum
ALTER TYPE "Resource" ADD VALUE 'SECURITY_EVENT';

-- DropForeignKey
ALTER TABLE "AISummary" DROP CONSTRAINT "AISummary_callId_fkey";

-- DropForeignKey
ALTER TABLE "AISummary" DROP CONSTRAINT "AISummary_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Call" DROP CONSTRAINT "Call_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CallParticipant" DROP CONSTRAINT "CallParticipant_callId_fkey";

-- DropForeignKey
ALTER TABLE "CallParticipant" DROP CONSTRAINT "CallParticipant_contactId_fkey";

-- DropForeignKey
ALTER TABLE "CallParticipant" DROP CONSTRAINT "CallParticipant_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CallParticipant" DROP CONSTRAINT "CallParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "CallRecording" DROP CONSTRAINT "CallRecording_callId_fkey";

-- DropForeignKey
ALTER TABLE "CallRecording" DROP CONSTRAINT "CallRecording_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CallTranscript" DROP CONSTRAINT "CallTranscript_callId_fkey";

-- DropForeignKey
ALTER TABLE "CallTranscript" DROP CONSTRAINT "CallTranscript_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationMember" DROP CONSTRAINT "ConversationMember_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationMember" DROP CONSTRAINT "ConversationMember_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationMember" DROP CONSTRAINT "ConversationMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "EmailAttachment" DROP CONSTRAINT "EmailAttachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "EmailAttachment" DROP CONSTRAINT "EmailAttachment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "EmailMessage" DROP CONSTRAINT "EmailMessage_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "EmailMessage" DROP CONSTRAINT "EmailMessage_threadId_fkey";

-- DropForeignKey
ALTER TABLE "EmailThread" DROP CONSTRAINT "EmailThread_customerId_fkey";

-- DropForeignKey
ALTER TABLE "EmailThread" DROP CONSTRAINT "EmailThread_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MessageAttachment" DROP CONSTRAINT "MessageAttachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageAttachment" DROP CONSTRAINT "MessageAttachment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MessageMention" DROP CONSTRAINT "MessageMention_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageMention" DROP CONSTRAINT "MessageMention_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MessageMention" DROP CONSTRAINT "MessageMention_userId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadStatus" DROP CONSTRAINT "MessageReadStatus_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadStatus" DROP CONSTRAINT "MessageReadStatus_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadStatus" DROP CONSTRAINT "MessageReadStatus_userId_fkey";

-- DropTable
DROP TABLE "AISummary";

-- DropTable
DROP TABLE "Call";

-- DropTable
DROP TABLE "CallParticipant";

-- DropTable
DROP TABLE "CallRecording";

-- DropTable
DROP TABLE "CallTranscript";

-- DropTable
DROP TABLE "Conversation";

-- DropTable
DROP TABLE "ConversationMember";

-- DropTable
DROP TABLE "EmailAttachment";

-- DropTable
DROP TABLE "EmailMessage";

-- DropTable
DROP TABLE "EmailThread";

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "MessageAttachment";

-- DropTable
DROP TABLE "MessageMention";

-- DropTable
DROP TABLE "MessageReadStatus";

-- DropEnum
DROP TYPE "ConversationMemberRole";

-- DropEnum
DROP TYPE "ConversationType";

-- DropEnum
DROP TYPE "EmailDeliveryStatus";

-- DropEnum
DROP TYPE "EmailDirection";

-- DropEnum
DROP TYPE "MessageStatus";

-- DropEnum
DROP TYPE "MessageType";

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ChatConversationType" NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReadReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailRecipient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT,
    "senderId" TEXT NOT NULL,
    "subject" TEXT,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "toIds" JSONB,
    "ccIds" JSONB,
    "bccIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "attachedToType" "AttachmentType" NOT NULL,
    "attachedToId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "callerEmployeeId" TEXT,
    "receiverEmployeeId" TEXT,
    "provider" "CallProvider" NOT NULL DEFAULT 'INTERNAL',
    "providerCallId" TEXT,
    "duration" INTEGER,
    "status" "CallStatus" NOT NULL,
    "recordingMetadata" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPresence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "UserPresenceStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "SecurityEventType" NOT NULL,
    "severity" "SecurityEventSeverity" NOT NULL,
    "source" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiredPermission" TEXT,
    "riskLevel" "AIRiskLevel" NOT NULL DEFAULT 'LOW',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AITool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "status" "AIExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentEmbedding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "departmentId" TEXT,
    "createdById" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentPermission" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "roleId" TEXT,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMemory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AIMemoryType" NOT NULL,
    "visibility" "AIMemoryVisibility" NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "importanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "source" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAgentExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "status" "AIAgentExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiExecutionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "embeddingId" TEXT,
    "citationText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProviderConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITokenUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowId" TEXT,
    "aiExecutionId" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AITokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTrigger" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecutionStep" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "status" "WorkflowExecutionStepStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowExecutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatConversation_tenantId_createdAt_idx" ON "ChatConversation"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_tenantId_conversationId_idx" ON "ChatParticipant"("tenantId", "conversationId");

-- CreateIndex
CREATE INDEX "ChatParticipant_tenantId_userId_idx" ON "ChatParticipant"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_conversationId_userId_key" ON "ChatParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_tenantId_conversationId_createdAt_idx" ON "ChatMessage"("tenantId", "conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatReadReceipt_tenantId_messageId_idx" ON "ChatReadReceipt"("tenantId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReadReceipt_messageId_userId_key" ON "ChatReadReceipt"("messageId", "userId");

-- CreateIndex
CREATE INDEX "MailThread_tenantId_createdAt_idx" ON "MailThread"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MailRecipient_tenantId_messageId_idx" ON "MailRecipient"("tenantId", "messageId");

-- CreateIndex
CREATE INDEX "MailRecipient_tenantId_userId_idx" ON "MailRecipient"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "MailMessage_tenantId_threadId_createdAt_idx" ON "MailMessage"("tenantId", "threadId", "createdAt");

-- CreateIndex
CREATE INDEX "MailDraft_tenantId_senderId_idx" ON "MailDraft"("tenantId", "senderId");

-- CreateIndex
CREATE INDEX "CommunicationAttachment_tenantId_attachedToType_attachedToI_idx" ON "CommunicationAttachment"("tenantId", "attachedToType", "attachedToId");

-- CreateIndex
CREATE INDEX "CommunicationAttachment_tenantId_uploaderId_idx" ON "CommunicationAttachment"("tenantId", "uploaderId");

-- CreateIndex
CREATE INDEX "CallLog_tenantId_callerEmployeeId_idx" ON "CallLog"("tenantId", "callerEmployeeId");

-- CreateIndex
CREATE INDEX "CallLog_tenantId_receiverEmployeeId_idx" ON "CallLog"("tenantId", "receiverEmployeeId");

-- CreateIndex
CREATE INDEX "CallLog_tenantId_createdAt_idx" ON "CallLog"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPresence_userId_key" ON "UserPresence"("userId");

-- CreateIndex
CREATE INDEX "UserPresence_tenantId_status_idx" ON "UserPresence"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SecurityEvent_tenantId_createdAt_idx" ON "SecurityEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_tenantId_eventType_idx" ON "SecurityEvent"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "SecurityEvent_tenantId_severity_idx" ON "SecurityEvent"("tenantId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "AITool_name_key" ON "AITool"("name");

-- CreateIndex
CREATE INDEX "AIExecution_tenantId_userId_idx" ON "AIExecution"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AIExecution_tenantId_status_idx" ON "AIExecution"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AIExecution_tenantId_createdAt_idx" ON "AIExecution"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentEmbedding_tenantId_documentId_idx" ON "DocumentEmbedding"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentEmbedding_tenantId_departmentId_idx" ON "DocumentEmbedding"("tenantId", "departmentId");

-- CreateIndex
CREATE INDEX "DocumentPermission_documentId_userId_idx" ON "DocumentPermission"("documentId", "userId");

-- CreateIndex
CREATE INDEX "DocumentPermission_documentId_roleId_idx" ON "DocumentPermission"("documentId", "roleId");

-- CreateIndex
CREATE INDEX "AIMemory_tenantId_userId_type_idx" ON "AIMemory"("tenantId", "userId", "type");

-- CreateIndex
CREATE INDEX "AIAgentExecution_tenantId_correlationId_idx" ON "AIAgentExecution"("tenantId", "correlationId");

-- CreateIndex
CREATE INDEX "AIReference_tenantId_aiExecutionId_idx" ON "AIReference"("tenantId", "aiExecutionId");

-- CreateIndex
CREATE INDEX "AIProviderConfig_tenantId_provider_idx" ON "AIProviderConfig"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "AITokenUsage_tenantId_userId_timestamp_idx" ON "AITokenUsage"("tenantId", "userId", "timestamp");

-- CreateIndex
CREATE INDEX "Workflow_tenantId_status_idx" ON "Workflow"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkflowTrigger_workflowId_idx" ON "WorkflowTrigger"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowAction_workflowId_orderIndex_idx" ON "WorkflowAction"("workflowId", "orderIndex");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_status_idx" ON "WorkflowExecution"("workflowId", "status");

-- CreateIndex
CREATE INDEX "WorkflowExecutionStep_executionId_idx" ON "WorkflowExecutionStep"("executionId");

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadReceipt" ADD CONSTRAINT "ChatReadReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadReceipt" ADD CONSTRAINT "ChatReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadReceipt" ADD CONSTRAINT "ChatReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailThread" ADD CONSTRAINT "MailThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailRecipient" ADD CONSTRAINT "MailRecipient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailRecipient" ADD CONSTRAINT "MailRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "MailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailRecipient" ADD CONSTRAINT "MailRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailDraft" ADD CONSTRAINT "MailDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailDraft" ADD CONSTRAINT "MailDraft_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailDraft" ADD CONSTRAINT "MailDraft_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAttachment" ADD CONSTRAINT "CommunicationAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAttachment" ADD CONSTRAINT "CommunicationAttachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AITool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEmbedding" ADD CONSTRAINT "DocumentEmbedding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEmbedding" ADD CONSTRAINT "DocumentEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEmbedding" ADD CONSTRAINT "DocumentEmbedding_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEmbedding" ADD CONSTRAINT "DocumentEmbedding_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAgentExecution" ADD CONSTRAINT "AIAgentExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAgentExecution" ADD CONSTRAINT "AIAgentExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReference" ADD CONSTRAINT "AIReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReference" ADD CONSTRAINT "AIReference_aiExecutionId_fkey" FOREIGN KEY ("aiExecutionId") REFERENCES "AIExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReference" ADD CONSTRAINT "AIReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProviderConfig" ADD CONSTRAINT "AIProviderConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_aiExecutionId_fkey" FOREIGN KEY ("aiExecutionId") REFERENCES "AIExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTrigger" ADD CONSTRAINT "WorkflowTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecutionStep" ADD CONSTRAINT "WorkflowExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecutionStep" ADD CONSTRAINT "WorkflowExecutionStep_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "WorkflowAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- Phase 9 RLS Policies
-- -----------------------------------------------------------------------------

ALTER TABLE "public"."DocumentEmbedding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DocumentEmbedding" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_DocumentEmbedding" ON "public"."DocumentEmbedding" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE "public"."AIMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AIMemory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AIMemory" ON "public"."AIMemory" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE "public"."AIAgentExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AIAgentExecution" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AIAgentExecution" ON "public"."AIAgentExecution" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE "public"."AITokenUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AITokenUsage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AITokenUsage" ON "public"."AITokenUsage" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE "public"."AIProviderConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AIProviderConfig" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AIProviderConfig" ON "public"."AIProviderConfig" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE "public"."AIReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AIReference" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AIReference" ON "public"."AIReference" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE "public"."Workflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Workflow" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_Workflow" ON "public"."Workflow" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE "public"."WorkflowTrigger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkflowTrigger" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WorkflowTrigger" ON "public"."WorkflowTrigger" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowTrigger"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text));

ALTER TABLE "public"."WorkflowAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkflowAction" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WorkflowAction" ON "public"."WorkflowAction" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowAction"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text));

ALTER TABLE "public"."WorkflowExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkflowExecution" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WorkflowExecution" ON "public"."WorkflowExecution" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowExecution"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text));

ALTER TABLE "public"."WorkflowExecutionStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkflowExecutionStep" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WorkflowExecutionStep" ON "public"."WorkflowExecutionStep" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."WorkflowExecution" we JOIN "public"."Workflow" w ON w.id = we."workflowId" WHERE we.id = "WorkflowExecutionStep"."executionId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text));

