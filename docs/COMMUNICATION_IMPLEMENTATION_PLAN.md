# Communication Module Implementation Plan

## 1. Communication Module Scope
The Communication Module provides an omnichannel experience natively embedded into the CRM, abstracting external providers for calls, emails, messages, and internal notifications.
- **Telephony System**: Inbound/outbound VOIP calling, voicemail, and call recording management.
- **Email System**: Bi-directional email synchronization (send/receive), templating, and thread tracking.
- **Internal Chat System**: Direct messaging and group channels for users within a tenant organization, including WhatsApp integration for external clients.
- **Notification System**: In-app alerts, push notifications, and email summaries for critical events (e.g., Lead conversion, Task assignment).

---

## 2. Database Design Proposal

All communication entities will strict enforce multi-tenant isolation via mandatory `tenantId` fields.

### Telephony
- **`Call`**:
  - *Purpose*: Log telephony interactions.
  - *Fields*: `id`, `tenantId`, `providerId`, `direction` (INBOUND/OUTBOUND), `status`, `durationSeconds`, `startedAt`, `endedAt`.
  - *Tenant Relationship*: Belongs to `Tenant`.
  - *Security*: Soft deletion only. Access bound to assigned users or managers.
  - *Index Strategy*: `@@index([tenantId, startedAt])`, `@@index([tenantId, providerId])`.
- **`CallParticipant`**:
  - *Purpose*: Link calls to specific users, contacts, or unknown numbers.
  - *Fields*: `id`, `tenantId`, `callId`, `userId?`, `contactId?`, `phoneNumber`.
- **`CallRecording`**:
  - *Purpose*: Metadata and secure URLs for recorded audio.
  - *Fields*: `id`, `tenantId`, `callId`, `storageKey`, `duration`, `sizeBytes`.

### Email
- **`EmailThread`**:
  - *Purpose*: Group related email messages.
  - *Fields*: `id`, `tenantId`, `subject`, `externalThreadId`.
- **`EmailMessage`**:
  - *Purpose*: Individual email content.
  - *Fields*: `id`, `tenantId`, `threadId`, `direction`, `from`, `to`, `cc`, `bcc`, `bodyHtml`, `bodyText`, `sentAt`.
- **`EmailAttachment`**:
  - *Purpose*: Securely reference attached files.
  - *Fields*: `id`, `tenantId`, `messageId`, `fileName`, `mimeType`, `storageKey`.

### Chat
- **`Conversation`**:
  - *Purpose*: A chat room (internal or WhatsApp).
  - *Fields*: `id`, `tenantId`, `type` (INTERNAL, WHATSAPP), `name?`.
- **`Message`**:
  - *Purpose*: The chat payload.
  - *Fields*: `id`, `tenantId`, `conversationId`, `senderId`, `content`, `createdAt`.
- **`MessageAttachment`**:
  - *Purpose*: Media sent in chat.
  - *Fields*: `id`, `tenantId`, `messageId`, `storageKey`, `mimeType`.
- **`MessageReadStatus`**:
  - *Purpose*: Read receipts.
  - *Fields*: `id`, `tenantId`, `messageId`, `userId`, `readAt`.

### Notification
- **`Notification`**:
  - *Purpose*: Deliver alerts to users.
  - *Fields*: `id`, `tenantId`, `userId`, `type`, `title`, `body`, `actionUrl?`, `isRead`, `createdAt`.
- **`NotificationPreference`**:
  - *Purpose*: User-specific opt-ins.
  - *Fields*: `id`, `tenantId`, `userId`, `emailEnabled`, `pushEnabled`, `inAppEnabled`.

---

## 3. CRM Integration Design

Communication entities will bind directly to CRM context dynamically using polymorphic relations or explicit foreign keys where applicable.

**Architecture Flow:**
`Customer` (or `Lead`)
 ├── `Emails` (Linked via `EmailThread.customerId`)
 ├── `Calls` (Linked via `CallParticipant.contactId -> CustomerContact`)
 ├── `Messages` (Linked via `Conversation.customerId`)
 └── `ActivityTimeline`

*Whenever a Call concludes or an Email is sent, the Communication service will trigger `createTimelineEntry()` from Phase 3.3 to inject a unified `ActivityTimeline` event onto the Customer/Lead dashboard.*

---

## 4. Security Architecture

- **Attachment Encryption Strategy**: All `CallRecording`, `EmailAttachment`, and `MessageAttachment` files uploaded to AWS S3/R2 must be encrypted at rest (AES-256).
- **Signed URLs**: The UI will *never* receive raw bucket URLs. The API will generate short-lived (e.g., 5-minute) pre-signed URLs for authorized users only.
- **Retention Policies**: Configurable per tenant (e.g., delete call recordings after 90 days to save costs), enforced by background CRON jobs.
- **Audit Requirements**: Deleting a thread, downloading an attachment, or listening to a call recording will strictly generate an `AuditLog` entry.
- **PII Handling**: Email bodies and chat contents contain heavy Personally Identifiable Information (PII). They must be rigorously isolated via the Prisma Tenant extension.
- **Access Control Rules**: 
  - `COMMUNICATION:READ` / `COMMUNICATION:WRITE`.
  - Users can only read conversations they are participants in, unless they hold `TENANT_ADMIN` role.

---

## 5. Provider Architecture

To avoid vendor lock-in, external services will be wrapped in an abstraction layer (`src/lib/providers/`):

- **Telephony Provider Interface**:
  - Abstraction: `makeCall()`, `endCall()`, `getRecording()`.
  - Target Implementation: Twilio, Plivo.
- **Email Provider Interface**:
  - Abstraction: `sendEmail()`, `verifyDomain()`.
  - Target Implementation: Resend, SendGrid.
- **Messaging Provider Interface**:
  - Abstraction: `sendMessage()`, `verifyWebhook()`.
  - Target Implementation: WhatsApp Business API (Meta).

---

## 6. Webhook Security

External providers will send events (inbound SMS, incoming Email, Call status changes) to our API.

- **Signature Verification**: Every provider webhook (e.g., `/api/webhooks/twilio`) must cryptographically verify the provider's signature header against our stored secrets.
- **Replay Prevention**: Check timestamps in payloads (if supported) and rely on idempotency keys.
- **Idempotency Handling**: We will store the external `providerEventId` with a Unique constraint in the DB. If Twilio sends the same "Call Completed" webhook twice, the database will silently reject the duplicate.
- **Failed Delivery Handling**: If our webhook crashes, providers typically retry. We must ensure webhook handlers are lightweight, pushing complex processing (like AI transcription) to background queues.

---

## 7. Future Scaling Considerations

- **Background Jobs**: Transcription of `CallRecording` using Gemini or Whisper must occur asynchronously via a job queue (e.g., Upstash QStash or Redis BullMQ).
- **Event-Driven Architecture**: Decouple the CRM from Communications via Event Emitters (e.g., `on('email.received', triggerNotification)`).
- **Large Attachment Storage**: Direct-to-S3 presigned uploads for the client to bypass Next.js API payload limits (Vercel 4.5MB limit).
- **Message Indexing**: If chat history grows massively, `Message` contents may need to be synced to Elasticsearch or Algolia for fast, typo-tolerant search across millions of rows.
