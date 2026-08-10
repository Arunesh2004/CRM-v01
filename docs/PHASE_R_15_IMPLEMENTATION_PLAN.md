# Phase R.15 Implementation Plan — Enterprise Communication Infrastructure Abstraction & Demo Readiness

## Objective
Build a production-ready communication infrastructure layer where all communication features (Chat, Calling, Video, Storage, Email) work in DEMO mode by default. The architecture will allow switching to real production providers (Twilio, SendGrid, AWS, Supabase, etc.) seamlessly on a **per-tenant basis** using credentials stored in `TenantIntegration`, falling back to global `.env` or Demo providers.

---

## 1. Architecture Design Pattern

We will implement an async Factory pattern that dynamically resolves the correct provider based on the Tenant's configured integrations, ensuring true multi-tenant support.

**Dependency Flow:**
UI → Next.js Server Action → Domain Service (e.g., `chat.service.ts`) → `ProviderFactory.getForTenant(tenantId)` → Specific Provider Interface (e.g., `TwilioCallProvider`)

Domain Services (`src/modules/*`) **own the database records** (e.g., `Message`, `Call`, `EmailMessage`). Providers **only handle transport and external API communication**.

---

## 2. Database Schema Updates

#### [MODIFY] [schema.prisma](file:///C:/Users/Administrator/.gemini/antigravity-ide/scratch/AI-Security-CRM-SaaS/database/schema.prisma)
1. **Enums:** Add `STORAGE`, `INTERNAL_CHAT`, `VIDEO` to the `IntegrationProvider` enum.
2. **Video Meeting Models:** 
   - Add `Meeting` model (id, tenantId, providerId, status, startedAt, endedAt).
   - Add `MeetingParticipant` model (id, meetingId, userId, contactId, role).
3. **Demo Storage Model:** Add `DemoStorage` model to store Base64 file contents for serverless-safe demo uploads.
4. **Integration Health Monitoring:** Add `status`, `lastCheckedAt`, `lastError`, `expiresAt` to `TenantIntegration`.
5. **Provider Capability Matrix:** Add `capabilities` (JSON) to `TenantIntegration` to store supported features (e.g. `{ "calling": true, "sms": false }`).

---

## 3. Infrastructure Interfaces & Providers

All providers will live in `src/infrastructure/`.

### A. Internal Chat (`src/infrastructure/chat/`)
- **Interface:** `chat.interface.ts`
  - `sendMessage(payload)`, `broadcastTyping(userId, conversationId)`
- **Demo Provider:** Uses standard Next.js API polling or simulated delays.
- **Data Ownership:** `Message` and `Conversation` models in DB remain the absolute source of truth.

### B. Calling System (`src/infrastructure/calling/`)
- **Interface:** `call.interface.ts`
  - `startCall(to, from)`, `endCall(callId)`, `generateClientToken(userId)`
- **Webhook Interface:** Must expose standard methods to normalize provider webhooks (e.g., status updates, recording completed). Includes **Signature Verification Layer** to prevent spoofing.
- **Demo Provider:** Simulates a ringing/active call UI, generating mock `Call` and `ActivityTimeline` records upon completion.

### C. Video Meetings (`src/infrastructure/video/`)
- **Interface:** `video.interface.ts`
  - `createMeeting()`, `generateJoinToken(meetingId, participantId)`, `endMeeting()`
- **Demo Provider:** Renders fake participant cards and handles local state, saving a `Meeting` record on end.

### D. File Storage (`src/infrastructure/storage/`)
- **Interface:** `storage.interface.ts`
  - `upload(buffer, path)`, `getSignedUrl(path)`, `delete(path)`
- **Demo Provider:** Stores small files as `Base64` strings in the `DemoStorage` database table, or mock the upload completely for large files.

### E. Email System (`src/infrastructure/email/`)
- **Interface:** `email.interface.ts`
  - `sendEmail(payload)`, `parseInboundWebhook(req)`
- **Demo Provider:** Mocks outbound sending and provides a dummy inbox UI.

---

## 4. Tenant Integration Management & Security

### Settings UI
- **Path:** `/settings/integrations`
- Admins can configure their own Twilio SID, AWS Keys, etc.
- Displays connection status per provider type, including Health Monitoring (e.g. "Expired", "Last Checked: 10m ago").

### Security Strategy
- **Encryption:** `src/lib/encryption.ts` utilizing `crypto` (AES-256-GCM) with a global `ENCRYPTION_KEY` from `.env`.
- **Isolation:** `ProviderFactory` strictly calls `requireTenant()` and retrieves only the keys for that specific `tenantId`.
- **RBAC:** Integration settings require `requirePermission('SYSTEM', 'UPDATE')`.
- **Audit Logs:** Log `INTEGRATION_CREATED`, `INTEGRATION_UPDATED`, `INTEGRATION_DELETED`, `PROVIDER_CHANGED` events.

---

## 5. Demo Environment Seeder

### [NEW] `scripts/seed-demo-tenant.ts`
- Generates the "Acme Security Solutions" tenant.
- Populates realistic mock data: 100+ Customers, 100+ Deals, 5000+ Messages, 200+ Calls.
- Demo Providers will create **REAL** CRM artifacts (Call records, Timeline events, AI summaries) during simulated interactions to provide an authentic product experience.

---

## Verification Plan

### Automated Checks
- Zero TypeScript errors across all generic interfaces and stubbed adapters.
- Webhook signature verification blocks unauthorized payloads.

### Manual Readiness Tests
- **Migration Test:** Ensure a developer can switch a tenant from `DemoCallProvider` to `TwilioCallProvider` by strictly adding a `TenantIntegration` record.
- **Demo Experience:** Verify the simulated Call and Video UI feels realistic and produces correct database artifacts.
