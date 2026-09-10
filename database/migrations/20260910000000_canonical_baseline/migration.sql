-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETION_REQUESTED', 'DELETED', 'PENDING');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RpoPolicy" AS ENUM ('BASIC', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'AI', 'AUTOMATION');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('WHATSAPP', 'EMAIL', 'TELEPHONY', 'STORAGE', 'INTERNAL_CHAT', 'VIDEO');

-- CreateEnum
CREATE TYPE "Resource" AS ENUM ('INCIDENT', 'CUSTOMER', 'CAMERA', 'USER', 'SYSTEM', 'LEAD', 'TASK', 'LOCATION', 'COMMUNICATION', 'STREAM', 'RECORDING', 'AI_EVENT', 'SECURITY_EVENT', 'REVENUE', 'SALES_INTEL', 'TICKET', 'PRODUCT');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "Action" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'RESOLVE', 'APPROVE', 'MANAGE_TERRITORIES');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('RLS_VIOLATION_ATTEMPT', 'UNAUTHORIZED_PII_ACCESS', 'AI_BLOCKED_ACTION', 'AI_PERMISSION_FAILURE', 'FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY', 'WEBHOOK_SIGNATURE_FAILURE', 'RATE_LIMIT_TRIGGERED');

-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AIRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AIExecutionStatus" AS ENUM ('PENDING', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CameraAuthMode" AS ENUM ('NONE', 'PASSWORD');

-- CreateEnum
CREATE TYPE "CameraStreamInvalidationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CCTVNodeStatus" AS ENUM ('HEALTHY', 'UNREACHABLE', 'DRAINING', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CHURNED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TimelineType" AS ENUM ('NOTE', 'EMAIL', 'CALL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('LEAD', 'CUSTOMER', 'TASK', 'LOCATION', 'CONTACT', 'DEAL', 'PROJECT', 'TICKET', 'INCIDENT');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ALERT', 'REMINDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "CameraProtocol" AS ENUM ('RTSP', 'ONVIF');

-- CreateEnum
CREATE TYPE "CameraStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CameraEventType" AS ENUM ('CONNECT', 'DISCONNECT', 'REBOOT', 'MOTION');

-- CreateEnum
CREATE TYPE "EventSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ChatConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "ChatParticipantRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MailDraftStatus" AS ENUM ('DRAFT');

-- CreateEnum
CREATE TYPE "CallProvider" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('COMPLETED', 'MISSED', 'FAILED', 'QUEUED', 'RINGING', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "UserPresenceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'AWAY', 'BUSY');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('CHAT', 'MAIL', 'CALL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('REQUESTED', 'VALIDATING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RecoverySnapshotStatus" AS ENUM ('ACTIVE', 'DELETE_PENDING', 'DELETED');

-- CreateEnum
CREATE TYPE "RecoveryMode" AS ENUM ('RECOVERY', 'CLONE', 'DRY_RUN');

-- CreateEnum
CREATE TYPE "AIRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AIConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

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

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deletionReason" TEXT,
    "rpoPolicy" "RpoPolicy" NOT NULL DEFAULT 'BASIC',
    "cctvRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "isRestoreLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantBootstrap" (
    "tenantId" TEXT NOT NULL,
    "bootstrappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantBootstrap_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "departmentId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "email" TEXT NOT NULL,
    "employeeId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "designation" TEXT,
    "profilePhotoUrl" TEXT,
    "tenantId" TEXT NOT NULL,
    "departmentId" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceInfo" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "resource" "Resource" NOT NULL,
    "action" "Action" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "capabilities" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPhoneNumber" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'TELEPHONY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "capabilities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION DEFAULT 0,
    "scoreFactors" JSONB,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "industry" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "coordinates" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedUserId" TEXT,
    "leadId" TEXT,
    "customerId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CRMComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTimeline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TimelineType" NOT NULL,
    "content" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingParticipant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT,
    "contactId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ATTENDEE',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoStorage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "base64Data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoStorage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "customerId" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "manufacturer" TEXT,
    "ipAddress" TEXT NOT NULL,
    "protocol" "CameraProtocol" NOT NULL,
    "status" "CameraStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastHeartbeat" TIMESTAMP(3),
    "authMode" "CameraAuthMode" NOT NULL DEFAULT 'NONE',
    "streamVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "encryptedUsername" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraStream" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "streamUrl" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "status" "StreamStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "RecordingStatus" NOT NULL DEFAULT 'PROCESSING',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "sizeBytes" INTEGER,
    "segmentId" TEXT,
    "streamVersion" INTEGER NOT NULL DEFAULT 0,
    "sourceNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "eventType" "CameraEventType" NOT NULL,
    "severity" "EventSeverity" NOT NULL DEFAULT 'INFO',
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "detectedObject" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordingId" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AIEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraStreamInvalidation" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "streamVersion" INTEGER NOT NULL,
    "opaquePath" TEXT NOT NULL,
    "status" "CameraStreamInvalidationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CameraStreamInvalidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CCTVNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CCTVNodeStatus" NOT NULL DEFAULT 'HEALTHY',
    "webhookKeyId" TEXT NOT NULL,
    "webhookSecretRef" TEXT NOT NULL,
    "lastHeartbeat" TIMESTAMP(3),
    "diskUsagePct" DOUBLE PRECISION,
    "diskFreeGb" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CCTVNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordingIngestionJob" (
    "id" TEXT NOT NULL,
    "localFilePath" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "recordingNodeId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "terminalReason" TEXT,
    "workerId" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordingIngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionDeletionJob" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "terminalReason" TEXT,
    "workerId" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionDeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysisJob" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "terminalReason" TEXT,
    "workerId" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ChatConversationType" NOT NULL,
    "name" TEXT,
    "customerId" TEXT,
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
    "customerId" TEXT,
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
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "aiEventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'REQUESTED',
    "mode" "RecoveryMode" NOT NULL DEFAULT 'RECOVERY',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "checksum" TEXT,
    "archiveLocation" TEXT,
    "snapshotId" TEXT,
    "approvedBy" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoverySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schemaVersion" TEXT NOT NULL,
    "applicationVersion" TEXT,
    "prismaVersion" TEXT,
    "backupFormatVersion" TEXT,
    "encryptionAlgorithm" TEXT,
    "encryptionKeyVersion" TEXT,
    "kmsKeyId" TEXT,
    "kmsKeyVersion" TEXT,
    "encryptedDEK" TEXT,
    "status" "RecoverySnapshotStatus" NOT NULL DEFAULT 'ACTIVE',
    "checksum" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoverySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestoreCheckpoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recoveryJobId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "checksum" TEXT,

    CONSTRAINT "RestoreCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isClosedWon" BOOLEAN NOT NULL DEFAULT false,
    "isClosedLost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "probability" INTEGER,
    "probabilityFactors" JSONB,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "lostReason" TEXT,
    "lostCompetitor" TEXT,
    "lostNotes" TEXT,
    "lostAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "pipelineId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "customerId" TEXT,
    "leadId" TEXT,
    "assignedUserId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealStageHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOutbox" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "EventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "status" "AIConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "AIRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConversationMessage_pkey" PRIMARY KEY ("id")
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
    "embedding" vector(1536),
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
    "tenantId" TEXT NOT NULL,

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
    "embedding" vector(1536),
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
    "cost" DECIMAL(19,8) NOT NULL,
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
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTrigger" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

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
    "tenantId" TEXT NOT NULL,

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
    "initiatedById" TEXT,
    "tenantId" TEXT NOT NULL,

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
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "WorkflowExecutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFamily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "familyId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBookEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceBookId" TEXT NOT NULL,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceBookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceBookId" TEXT,
    "maxDiscount" DOUBLE PRECISION NOT NULL,
    "minMargin" DOUBLE PRECISION,
    "approvalThreshold" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "priceBookId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "expirationDate" TIMESTAMP(3),
    "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "priceBookEntryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(19,4) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTerritory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'REP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTerritory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuota" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "targetAmount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DECIMAL(19,4) NOT NULL,
    "probability" INTEGER,
    "stageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldSecurityPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "securityLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldSecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ABACPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "effect" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ABACPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "workflowStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "approverId" TEXT,
    "approverRoleId" TEXT,
    "status" TEXT NOT NULL,
    "comments" TEXT,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderType" "ActorType" NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLAConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL,
    "responseMinutes" INTEGER NOT NULL DEFAULT 60,
    "resolutionTimeMinutes" INTEGER NOT NULL DEFAULT 1440,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLAConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLAEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SLAEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operation" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "requestHash" TEXT NOT NULL DEFAULT '',
    "resourceId" TEXT,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterQueue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "correlationId" TEXT,
    "payload" JSONB NOT NULL,
    "lastError" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "DeadLetterQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "planId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "amountDue" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_ownerId_key" ON "Tenant"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_tokenHash_key" ON "UserInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "UserInvitation_tenantId_email_idx" ON "UserInvitation"("tenantId", "email");

-- CreateIndex
CREATE INDEX "UserInvitation_tokenHash_idx" ON "UserInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_name_key" ON "Department"("tenantId", "name");

-- CreateIndex
CREATE INDEX "User_tenantId_id_idx" ON "User"("tenantId", "id");

-- CreateIndex
CREATE INDEX "User_tenantId_createdAt_idx" ON "User"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "User_tenantId_departmentId_idx" ON "User"("tenantId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_employeeId_key" ON "User"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_clerkId_key" ON "User"("tenantId", "clerkId");

-- CreateIndex
CREATE INDEX "DeviceSession_tenantId_userId_idx" ON "DeviceSession"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Role_tenantId_id_idx" ON "Role"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_actorId_idx" ON "AuditLog"("tenantId", "actorId");

-- CreateIndex
CREATE INDEX "TenantIntegration_tenantId_idx" ON "TenantIntegration"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantIntegration_tenantId_provider_key" ON "TenantIntegration"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPhoneNumber_phoneNumber_key" ON "TenantPhoneNumber"("phoneNumber");

-- CreateIndex
CREATE INDEX "TenantPhoneNumber_tenantId_idx" ON "TenantPhoneNumber"("tenantId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tenantId_email_key" ON "Lead"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tenantId_name_company_key" ON "Lead"("tenantId", "name", "company");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_name_idx" ON "Customer"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_normalizedName_key" ON "Customer"("tenantId", "normalizedName");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_customerId_idx" ON "CustomerContact"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Location_tenantId_customerId_idx" ON "Location"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Task_tenantId_assignedUserId_status_idx" ON "Task"("tenantId", "assignedUserId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_leadId_idx" ON "Task"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "Task_tenantId_customerId_idx" ON "Task"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Task_tenantId_dueDate_idx" ON "Task"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_tenantId_priority_idx" ON "Task"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "CRMComment_tenantId_entityType_entityId_idx" ON "CRMComment"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "CRMComment_parentId_idx" ON "CRMComment"("parentId");

-- CreateIndex
CREATE INDEX "ActivityTimeline_tenantId_entityType_entityId_idx" ON "ActivityTimeline"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityTimeline_tenantId_actorId_idx" ON "ActivityTimeline"("tenantId", "actorId");

-- CreateIndex
CREATE INDEX "Meeting_tenantId_createdAt_idx" ON "Meeting"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Meeting_tenantId_startedAt_idx" ON "Meeting"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "MeetingParticipant_tenantId_meetingId_idx" ON "MeetingParticipant"("tenantId", "meetingId");

-- CreateIndex
CREATE INDEX "MeetingParticipant_tenantId_userId_idx" ON "MeetingParticipant"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "DemoStorage_tenantId_idx" ON "DemoStorage"("tenantId");

-- CreateIndex
CREATE INDEX "Document_tenantId_customerId_idx" ON "Document"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Document_tenantId_taskId_idx" ON "Document"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_idx" ON "Notification"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_tenantId_userId_idx" ON "NotificationPreference"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Camera_tenantId_locationId_idx" ON "Camera"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "Camera_tenantId_status_idx" ON "Camera"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CameraCredential_cameraId_key" ON "CameraCredential"("cameraId");

-- CreateIndex
CREATE INDEX "CameraCredential_tenantId_cameraId_idx" ON "CameraCredential"("tenantId", "cameraId");

-- CreateIndex
CREATE UNIQUE INDEX "CameraStream_cameraId_key" ON "CameraStream"("cameraId");

-- CreateIndex
CREATE INDEX "CameraStream_tenantId_status_idx" ON "CameraStream"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Recording_segmentId_key" ON "Recording"("segmentId");

-- CreateIndex
CREATE INDEX "Recording_tenantId_cameraId_startTime_idx" ON "Recording"("tenantId", "cameraId", "startTime");

-- CreateIndex
CREATE INDEX "Recording_tenantId_status_idx" ON "Recording"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CameraEvent_tenantId_cameraId_timestamp_idx" ON "CameraEvent"("tenantId", "cameraId", "timestamp");

-- CreateIndex
CREATE INDEX "CameraEvent_tenantId_eventType_idx" ON "CameraEvent"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "AIEvent_tenantId_cameraId_timestamp_idx" ON "AIEvent"("tenantId", "cameraId", "timestamp");

-- CreateIndex
CREATE INDEX "CameraStreamInvalidation_cameraId_idx" ON "CameraStreamInvalidation"("cameraId");

-- CreateIndex
CREATE INDEX "CameraStreamInvalidation_status_nextAttemptAt_idx" ON "CameraStreamInvalidation"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "CameraStreamInvalidation_cameraId_streamVersion_key" ON "CameraStreamInvalidation"("cameraId", "streamVersion");

-- CreateIndex
CREATE UNIQUE INDEX "CCTVNode_name_key" ON "CCTVNode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CCTVNode_webhookKeyId_key" ON "CCTVNode"("webhookKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordingIngestionJob_segmentId_key" ON "RecordingIngestionJob"("segmentId");

-- CreateIndex
CREATE INDEX "RecordingIngestionJob_recordingNodeId_status_leaseExpiresAt_idx" ON "RecordingIngestionJob"("recordingNodeId", "status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "RecordingIngestionJob_localFilePath_idx" ON "RecordingIngestionJob"("localFilePath");

-- CreateIndex
CREATE INDEX "RecordingIngestionJob_status_leaseExpiresAt_idx" ON "RecordingIngestionJob"("status", "leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionDeletionJob_recordingId_key" ON "RetentionDeletionJob"("recordingId");

-- CreateIndex
CREATE INDEX "RetentionDeletionJob_status_leaseExpiresAt_idx" ON "RetentionDeletionJob"("status", "leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIAnalysisJob_dedupeKey_key" ON "AIAnalysisJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "AIAnalysisJob_status_leaseExpiresAt_idx" ON "AIAnalysisJob"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "ChatConversation_tenantId_createdAt_idx" ON "ChatConversation"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatConversation_tenantId_customerId_idx" ON "ChatConversation"("tenantId", "customerId");

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
CREATE INDEX "MailThread_tenantId_customerId_idx" ON "MailThread"("tenantId", "customerId");

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
CREATE INDEX "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_createdAt_idx" ON "WebhookEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_aiEventId_key" ON "Incident"("aiEventId");

-- CreateIndex
CREATE INDEX "Incident_tenantId_status_idx" ON "Incident"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Incident_tenantId_severity_idx" ON "Incident"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "RecoveryJob_tenantId_status_idx" ON "RecoveryJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RecoveryJob_createdAt_idx" ON "RecoveryJob"("createdAt");

-- CreateIndex
CREATE INDEX "RecoverySnapshot_tenantId_createdAt_idx" ON "RecoverySnapshot"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "RecoveryAuditLog_tenantId_timestamp_idx" ON "RecoveryAuditLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "RecoveryAuditLog_jobId_idx" ON "RecoveryAuditLog"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "RestoreCheckpoint_chunkId_key" ON "RestoreCheckpoint"("chunkId");

-- CreateIndex
CREATE INDEX "RestoreCheckpoint_recoveryJobId_status_idx" ON "RestoreCheckpoint"("recoveryJobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RestoreCheckpoint_recoveryJobId_phase_model_chunkIndex_key" ON "RestoreCheckpoint"("recoveryJobId", "phase", "model", "chunkIndex");

-- CreateIndex
CREATE INDEX "Pipeline_tenantId_idx" ON "Pipeline"("tenantId");

-- CreateIndex
CREATE INDEX "PipelineStage_tenantId_pipelineId_idx" ON "PipelineStage"("tenantId", "pipelineId");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_order_idx" ON "PipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE INDEX "Deal_tenantId_status_idx" ON "Deal"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Deal_tenantId_stageId_idx" ON "Deal"("tenantId", "stageId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_assignedUserId_idx" ON "Deal"("tenantId", "assignedUserId");

-- CreateIndex
CREATE INDEX "DealStageHistory_tenantId_dealId_idx" ON "DealStageHistory"("tenantId", "dealId");

-- CreateIndex
CREATE INDEX "DealStageHistory_tenantId_createdAt_idx" ON "DealStageHistory"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventOutbox_eventId_key" ON "EventOutbox"("eventId");

-- CreateIndex
CREATE INDEX "EventOutbox_tenantId_status_nextRetryAt_idx" ON "EventOutbox"("tenantId", "status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "EventOutbox_eventId_idx" ON "EventOutbox"("eventId");

-- CreateIndex
CREATE INDEX "AIConversation_tenantId_userId_idx" ON "AIConversation"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AIConversation_tenantId_createdAt_idx" ON "AIConversation"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AIConversation_tenantId_status_updatedAt_idx" ON "AIConversation"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AIConversation_tenantId_status_archivedAt_idx" ON "AIConversation"("tenantId", "status", "archivedAt");

-- CreateIndex
CREATE INDEX "AIConversationMessage_tenantId_conversationId_createdAt_idx" ON "AIConversationMessage"("tenantId", "conversationId", "createdAt");

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

-- CreateIndex
CREATE INDEX "ProductCategory_tenantId_parentId_idx" ON "ProductCategory"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "ProductFamily_tenantId_idx" ON "ProductFamily"("tenantId");

-- CreateIndex
CREATE INDEX "Product_tenantId_sku_idx" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "Product_tenantId_categoryId_idx" ON "Product"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_tenantId_familyId_idx" ON "Product"("tenantId", "familyId");

-- CreateIndex
CREATE INDEX "PriceBook_tenantId_isActive_idx" ON "PriceBook"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "PriceBookEntry_tenantId_priceBookId_productId_idx" ON "PriceBookEntry"("tenantId", "priceBookId", "productId");

-- CreateIndex
CREATE INDEX "PriceBookEntry_tenantId_productId_idx" ON "PriceBookEntry"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "DiscountRule_tenantId_isActive_idx" ON "DiscountRule"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "DiscountRule_tenantId_priceBookId_idx" ON "DiscountRule"("tenantId", "priceBookId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_previousVersionId_key" ON "Quote"("previousVersionId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_customerId_idx" ON "Quote"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_dealId_idx" ON "Quote"("tenantId", "dealId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_status_idx" ON "Quote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Quote_tenantId_createdAt_idx" ON "Quote"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteLineItem_tenantId_quoteId_idx" ON "QuoteLineItem"("tenantId", "quoteId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_tenantId_priceBookEntryId_idx" ON "QuoteLineItem"("tenantId", "priceBookEntryId");

-- CreateIndex
CREATE INDEX "Territory_tenantId_idx" ON "Territory"("tenantId");

-- CreateIndex
CREATE INDEX "Territory_tenantId_parentId_idx" ON "Territory"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "UserTerritory_tenantId_userId_idx" ON "UserTerritory"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "UserTerritory_tenantId_territoryId_idx" ON "UserTerritory"("tenantId", "territoryId");

-- CreateIndex
CREATE INDEX "SalesQuota_tenantId_userId_idx" ON "SalesQuota"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "SalesQuota_tenantId_period_idx" ON "SalesQuota"("tenantId", "period");

-- CreateIndex
CREATE INDEX "DealSnapshot_tenantId_dealId_date_idx" ON "DealSnapshot"("tenantId", "dealId", "date");

-- CreateIndex
CREATE INDEX "DealSnapshot_tenantId_date_idx" ON "DealSnapshot"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FieldSecurityPolicy_tenantId_modelName_fieldName_key" ON "FieldSecurityPolicy"("tenantId", "modelName", "fieldName");

-- CreateIndex
CREATE INDEX "ABACPolicy_tenantId_resource_action_idx" ON "ABACPolicy"("tenantId", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_workflowStepId_key" ON "ApprovalRequest"("workflowStepId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_status_idx" ON "ApprovalRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ApprovalStep_tenantId_approvalRequestId_idx" ON "ApprovalStep"("tenantId", "approvalRequestId");

-- CreateIndex
CREATE INDEX "ApprovalStep_tenantId_status_idx" ON "ApprovalStep"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_status_idx" ON "Ticket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_assignedUserId_status_idx" ON "Ticket"("tenantId", "assignedUserId", "status");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_slaDeadline_idx" ON "Ticket"("tenantId", "slaDeadline");

-- CreateIndex
CREATE INDEX "TicketMessage_tenantId_ticketId_createdAt_idx" ON "TicketMessage"("tenantId", "ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SLAConfiguration_tenantId_priority_key" ON "SLAConfiguration"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "SLAEvent_tenantId_ticketId_idx" ON "SLAEvent"("tenantId", "ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "SLAEvent_tenantId_ticketId_type_key" ON "SLAEvent"("tenantId", "ticketId", "type");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_tenantId_key_key" ON "IdempotencyKey"("tenantId", "key");

-- CreateIndex
CREATE INDEX "DeadLetterQueue_tenantId_status_idx" ON "DeadLetterQueue"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DeadLetterQueue_createdAt_idx" ON "DeadLetterQueue"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantBootstrap" ADD CONSTRAINT "TenantBootstrap_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantIntegration" ADD CONSTRAINT "TenantIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPhoneNumber" ADD CONSTRAINT "TenantPhoneNumber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMComment" ADD CONSTRAINT "CRMComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMComment" ADD CONSTRAINT "CRMComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMComment" ADD CONSTRAINT "CRMComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CRMComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimeline" ADD CONSTRAINT "ActivityTimeline_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoStorage" ADD CONSTRAINT "DemoStorage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraCredential" ADD CONSTRAINT "CameraCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraCredential" ADD CONSTRAINT "CameraCredential_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraStream" ADD CONSTRAINT "CameraStream_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraStream" ADD CONSTRAINT "CameraStream_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "CCTVNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraEvent" ADD CONSTRAINT "CameraEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraEvent" ADD CONSTRAINT "CameraEvent_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEvent" ADD CONSTRAINT "AIEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEvent" ADD CONSTRAINT "AIEvent_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingIngestionJob" ADD CONSTRAINT "RecordingIngestionJob_recordingNodeId_fkey" FOREIGN KEY ("recordingNodeId") REFERENCES "CCTVNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysisJob" ADD CONSTRAINT "AIAnalysisJob_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "MailThread" ADD CONSTRAINT "MailThread_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_aiEventId_fkey" FOREIGN KEY ("aiEventId") REFERENCES "AIEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStageHistory" ADD CONSTRAINT "DealStageHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStageHistory" ADD CONSTRAINT "DealStageHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStageHistory" ADD CONSTRAINT "DealStageHistory_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStageHistory" ADD CONSTRAINT "DealStageHistory_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "PipelineStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStageHistory" ADD CONSTRAINT "DealStageHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOutbox" ADD CONSTRAINT "EventOutbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversationMessage" ADD CONSTRAINT "AIConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversationMessage" ADD CONSTRAINT "AIConversationMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTrigger" ADD CONSTRAINT "WorkflowTrigger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTrigger" ADD CONSTRAINT "WorkflowTrigger_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecutionStep" ADD CONSTRAINT "WorkflowExecutionStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecutionStep" ADD CONSTRAINT "WorkflowExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecutionStep" ADD CONSTRAINT "WorkflowExecutionStep_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "WorkflowAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFamily" ADD CONSTRAINT "ProductFamily_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ProductFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBook" ADD CONSTRAINT "PriceBook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_priceBookEntryId_fkey" FOREIGN KEY ("priceBookEntryId") REFERENCES "PriceBookEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTerritory" ADD CONSTRAINT "UserTerritory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTerritory" ADD CONSTRAINT "UserTerritory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTerritory" ADD CONSTRAINT "UserTerritory_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuota" ADD CONSTRAINT "SalesQuota_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuota" ADD CONSTRAINT "SalesQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealSnapshot" ADD CONSTRAINT "DealSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealSnapshot" ADD CONSTRAINT "DealSnapshot_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealSnapshot" ADD CONSTRAINT "DealSnapshot_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSecurityPolicy" ADD CONSTRAINT "FieldSecurityPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABACPolicy" ADD CONSTRAINT "ABACPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAConfiguration" ADD CONSTRAINT "SLAConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAEvent" ADD CONSTRAINT "SLAEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAEvent" ADD CONSTRAINT "SLAEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadLetterQueue" ADD CONSTRAINT "DeadLetterQueue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- MANUALLY INJECTED CATEGORY B (NATIVE) OBJECTS --

CREATE OR REPLACE FUNCTION public.audit_log_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only. Modification or deletion is strictly prohibited.';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.l2_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_distance$function$
;

CREATE OR REPLACE FUNCTION public.inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$inner_product$function$
;

CREATE OR REPLACE FUNCTION public.cosine_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$cosine_distance$function$
;

CREATE OR REPLACE FUNCTION public.l1_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l1_distance$function$
;

CREATE OR REPLACE FUNCTION public.array_to_vector(integer[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$
;

CREATE OR REPLACE FUNCTION public.array_to_vector(real[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$
;

CREATE OR REPLACE FUNCTION public.array_to_vector(double precision[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$
;

CREATE OR REPLACE FUNCTION public.array_to_vector(numeric[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$
;

CREATE TRIGGER prevent_audit_log_modification BEFORE DELETE OR UPDATE ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

ALTER TABLE "ABACPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ABACPolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ABACPolicy" ON "ABACPolicy" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "FieldSecurityPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldSecurityPolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_FieldSecurityPolicy" ON "FieldSecurityPolicy" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "SalesQuota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesQuota" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_sales_quota" ON "SalesQuota" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "ApprovalRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ApprovalRequest" ON "ApprovalRequest" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "RecoveryJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_recovery_job" ON "RecoveryJob" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "RecoverySnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoverySnapshot" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_recovery_snapshot" ON "RecoverySnapshot" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "RecoveryAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryAuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_recovery_audit_log" ON "RecoveryAuditLog" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "RestoreCheckpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestoreCheckpoint" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_restore_checkpoint" ON "RestoreCheckpoint" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "PriceBookEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBookEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for PriceBookEntry" ON "PriceBookEntry" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "DiscountRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscountRule" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for DiscountRule" ON "DiscountRule" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "PriceBook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBook" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for PriceBook" ON "PriceBook" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for Quote" ON "Quote" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "WorkflowAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowAction" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WorkflowAction" ON "WorkflowAction" TO public USING (((EXISTS ( SELECT 1
   FROM "Workflow" w
  WHERE ((w.id = "WorkflowAction"."workflowId") AND (w."tenantId" = current_setting('app.current_tenant_id'::text, true))))) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "WorkflowExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WorkflowExecution" ON "WorkflowExecution" TO public USING (((EXISTS ( SELECT 1
   FROM "Workflow" w
  WHERE ((w.id = "WorkflowExecution"."workflowId") AND (w."tenantId" = current_setting('app.current_tenant_id'::text, true))))) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "WorkflowExecutionStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecutionStep" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WorkflowExecutionStep" ON "WorkflowExecutionStep" TO public USING (((EXISTS ( SELECT 1
   FROM ("WorkflowExecution" we
     JOIN "Workflow" w ON ((w.id = we."workflowId")))
  WHERE ((we.id = "WorkflowExecutionStep"."executionId") AND (w."tenantId" = current_setting('app.current_tenant_id'::text, true))))) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "DeviceSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceSession" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_device_session" ON "DeviceSession" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_role" ON "Role" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_role_permission" ON "RolePermission" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK (((current_setting('app.bypass_rls'::text, true) = 'on'::text) OR (("tenantId" = current_setting('app.current_tenant_id'::text, true)) AND (EXISTS ( SELECT 1
   FROM "Role" r
  WHERE ((r.id = "RolePermission"."roleId") AND (r."tenantId" = current_setting('app.current_tenant_id'::text, true))))))));

ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_user_role" ON "UserRole" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK (((current_setting('app.bypass_rls'::text, true) = 'on'::text) OR (("tenantId" = current_setting('app.current_tenant_id'::text, true)) AND (EXISTS ( SELECT 1
   FROM "Role" r
  WHERE ((r.id = "UserRole"."roleId") AND (r."tenantId" = current_setting('app.current_tenant_id'::text, true))))))));

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy_customer" ON "Customer" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Meeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Meeting" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_meeting" ON "Meeting" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "MeetingParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingParticipant" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_meeting_participant" ON "MeetingParticipant" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Camera" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Camera" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_camera" ON "Camera" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "CameraCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraCredential" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_camera_credential" ON "CameraCredential" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "CameraStream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraStream" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_camera_stream" ON "CameraStream" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Recording" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recording" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_recording" ON "Recording" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AIProviderConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIProviderConfig" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AIProviderConfig" ON "AIProviderConfig" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy_user" ON "User" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AIMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIMemory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AIMemory" ON "AIMemory" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "DealSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealSnapshot" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_deal_snapshot" ON "DealSnapshot" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "ApprovalStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalStep" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ApprovalStep" ON "ApprovalStep" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_Ticket" ON "Ticket" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "EventOutbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventOutbox" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_event_outbox" ON "EventOutbox" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AIConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIConversation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ai_conversation" ON "AIConversation" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK (((current_setting('app.bypass_rls'::text, true) = 'on'::text) OR (("tenantId" = current_setting('app.current_tenant_id'::text, true)) AND (EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "AIConversation"."userId") AND (u."tenantId" = current_setting('app.current_tenant_id'::text, true))))))));

ALTER TABLE "AIConversationMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIConversationMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ai_conversation_msg" ON "AIConversationMessage" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK (((current_setting('app.bypass_rls'::text, true) = 'on'::text) OR (("tenantId" = current_setting('app.current_tenant_id'::text, true)) AND (EXISTS ( SELECT 1
   FROM "AIConversation" c
  WHERE ((c.id = "AIConversationMessage"."conversationId") AND (c."tenantId" = current_setting('app.current_tenant_id'::text, true))))))));

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy_document" ON "Document" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "TenantBootstrap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantBootstrap" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_tenantbootstrap" ON "TenantBootstrap" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "UserTerritory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTerritory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_user_territory" ON "UserTerritory" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "CommunicationAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommunicationAttachment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_comm_attachment" ON "CommunicationAttachment" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "CallLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_call_log" ON "CallLog" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "UserPresence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPresence" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_user_presence" ON "UserPresence" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "CustomerContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerContact" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy_customercontact" ON "CustomerContact" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy_task" ON "Task" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_pipeline_stage" ON "PipelineStage" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy_deal" ON "Deal" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "TicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_TicketMessage" ON "TicketMessage" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AIExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIExecution" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ai_execution" ON "AIExecution" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK (((current_setting('app.bypass_rls'::text, true) = 'on'::text) OR (("tenantId" = current_setting('app.current_tenant_id'::text, true)) AND (EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "AIExecution"."userId") AND (u."tenantId" = current_setting('app.current_tenant_id'::text, true))))) AND (("approvedBy" IS NULL) OR (EXISTS ( SELECT 1
   FROM "User" au
  WHERE ((au.id = "AIExecution"."approvedBy") AND (au."tenantId" = current_setting('app.current_tenant_id'::text, true)))))))));

ALTER TABLE "DocumentEmbedding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentEmbedding" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_DocumentEmbedding" ON "DocumentEmbedding" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "IdempotencyKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_idempotency_key" ON "IdempotencyKey" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "DealStageHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealStageHistory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_deal_stage_history" ON "DealStageHistory" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "ChatConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatConversation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_chat_conversation" ON "ChatConversation" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "ChatParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatParticipant" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_chat_participant" ON "ChatParticipant" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK (((current_setting('app.bypass_rls'::text, true) = 'on'::text) OR (("tenantId" = current_setting('app.current_tenant_id'::text, true)) AND (EXISTS ( SELECT 1
   FROM "ChatConversation" c
  WHERE ((c.id = "ChatParticipant"."conversationId") AND (c."tenantId" = current_setting('app.current_tenant_id'::text, true))))))));

ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_chat_message" ON "ChatMessage" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "ChatReadReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatReadReceipt" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_chat_read_receipt" ON "ChatReadReceipt" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "MailThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailThread" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_mail_thread" ON "MailThread" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "MailRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailRecipient" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_mail_recipient" ON "MailRecipient" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "MailMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_mail_message" ON "MailMessage" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AIAgentExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIAgentExecution" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AIAgentExecution" ON "AIAgentExecution" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AIReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIReference" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AIReference" ON "AIReference" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for ProductCategory" ON "ProductCategory" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for Product" ON "Product" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "TenantIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantIntegration" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_tenant_integration" ON "TenantIntegration" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_location" ON "Location" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "CRMComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CRMComment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_comment" ON "CRMComment" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "ActivityTimeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityTimeline" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_activity_timeline" ON "ActivityTimeline" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "DemoStorage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DemoStorage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_demo_storage" ON "DemoStorage" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_notification" ON "Notification" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_notification_pref" ON "NotificationPreference" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "CameraEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_camera_event" ON "CameraEvent" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AIEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ai_event" ON "AIEvent" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_webhook_event" ON "WebhookEvent" TO public USING (((current_setting('app.bypass_rls'::text, true) = 'on'::text) OR (("tenantId" IS NOT NULL) AND ("tenantId" = current_setting('app.current_tenant_id'::text, true))))) WITH CHECK (((current_setting('app.bypass_rls'::text, true) = 'on'::text) OR (("tenantId" IS NOT NULL) AND ("tenantId" = current_setting('app.current_tenant_id'::text, true)))));

ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Incident" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_incident" ON "Incident" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pipeline" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_pipeline" ON "Pipeline" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AITokenUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AITokenUsage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AITokenUsage" ON "AITokenUsage" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Workflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workflow" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_Workflow" ON "Workflow" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "WorkflowTrigger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowTrigger" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WorkflowTrigger" ON "WorkflowTrigger" TO public USING (((EXISTS ( SELECT 1
   FROM "Workflow" w
  WHERE ((w.id = "WorkflowTrigger"."workflowId") AND (w."tenantId" = current_setting('app.current_tenant_id'::text, true))))) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "SLAConfiguration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAConfiguration" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_SLAConfiguration" ON "SLAConfiguration" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "MailDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailDraft" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_mail_draft" ON "MailDraft" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_department" ON "Department" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "SecurityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_security_event" ON "SecurityEvent" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "DocumentPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentPermission" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_document_permission" ON "DocumentPermission" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "ProductFamily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductFamily" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for ProductFamily" ON "ProductFamily" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy_auditlog" ON "AuditLog" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy_lead" ON "Lead" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "DeadLetterQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeadLetterQueue" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_dlq" ON "DeadLetterQueue" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "TenantPhoneNumber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantPhoneNumber" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_phone_number_delete_policy" ON "TenantPhoneNumber" FOR DELETE TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

CREATE POLICY "tenant_phone_number_update_policy" ON "TenantPhoneNumber" FOR UPDATE TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

CREATE POLICY "tenant_phone_number_insert_policy" ON "TenantPhoneNumber" FOR INSERT TO public WITH CHECK ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

CREATE POLICY "tenant_phone_number_select_policy" ON "TenantPhoneNumber" FOR SELECT TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "QuoteLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteLineItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for QuoteLineItem" ON "QuoteLineItem" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "Territory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Territory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_territory" ON "Territory" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

CREATE POLICY "tenant_isolation_user_invitation" ON "UserInvitation" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text))) WITH CHECK (((("tenantId" = current_setting('app.current_tenant_id'::text, true)) AND ("roleId" IN ( SELECT "Role".id
   FROM "Role"
  WHERE ("Role"."tenantId" = current_setting('app.current_tenant_id'::text, true))))) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

ALTER TABLE "SLAEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_SLAEvent" ON "SLAEvent" TO public USING ((("tenantId" = current_setting('app.current_tenant_id'::text, true)) OR (current_setting('app.bypass_rls'::text, true) = 'on'::text)));

