# Phase B.2.0: Telephony Provider Reality Audit

## Objective
This document outlines the architectural audit for replacing the mocked Telephony subsystem with a real production Twilio integration. It guarantees that the CRM foundation is fully structurally capable of tracking inbound/outbound calls, secure audio recordings, and granular usage metering.

---

## 1. Database Readiness Audit

**Model: `Call`**
- **Support Verified:** Yes. It natively supports `direction` (`CallDirection.INBOUND`/`OUTBOUND`), `status` (`CallStatus.QUEUED`, `RINGING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `MISSED`), and strict `tenantId` mapping.
- **Duration Tracking:** Supported via `durationSeconds`, `startedAt`, and `endedAt`.
- **Foreign Keys:** Properly chained to `CallParticipant` and `CallRecording`.

**Model: `CallParticipant`**
- **Support Verified:** Yes. Dynamically links a given `Call` to `tenantId`, `userId` (the agent), and `contactId` (the customer), enabling precise CRM threading.

**Model: `CallRecording`**
- **Support Verified:** Yes. Maps `storageKey`, `duration`, and `sizeBytes` directly back to a `Call` and `tenantId`.

**Model: `UsageEvent`**
- **Status:** Requires a minor schema update. The `UsageType` enum currently supports `EMAIL_*` and generic `COMMUNICATION`. It must be extended to support explicit `VOICE_MINUTES` and `RECORDING_STORAGE`.

---

## 2. Provider Layer Audit
- **Current Abstraction:** Mocked. The platform possesses a conceptual `TelephonyProvider` interface but lacks a concrete `twilio.provider.ts`.
- **Missing SDK:** `twilio` must be installed.
- **Missing Credentials:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_SECRET` are scaffolded in `.env.example` but need integration into `src/lib/config/env.ts` when activated.
- **Missing Webhooks:** Need explicit Twilio Status Callbacks (`api/webhooks/twilio/status`) and Recording Callbacks (`api/webhooks/twilio/recording`).
- **Missing Retry Handling:** Outbound call API execution needs to be wrapped inside BullMQ for exponential backoff against API failures.

---

## 3. Reliability Requirements
- **BullMQ Integration:** Fully compatible. Telephony dialing actions will map directly onto a new `MakeCallWorker` similar to the `SendEmailWorker`.
- **Distributed Rate Limiting:** Compatible. We will use the existing Redis `DistributedRateLimiter` to throttle outbound dials (e.g., max 10 outbound attempts per minute per tenant) to prevent fraudulent toll abuse.
- **Structured Logging:** Compatible. Twilio `CallSid` maps perfectly to the log's contextual metadata payloads.
- **Webhook Replay Protection:** Compatible. Twilio webhooks will be ingested, cryptographically verified via `twilio.validateRequest()`, and passed to the deduplication `WebhookEvent` table natively.

---

## 4. Storage Integration
- **`CallRecording` & `S3StorageProvider`:** The architecture is perfectly aligned. When Twilio fires a recording callback, a BullMQ job can securely stream the raw audio from Twilio's URL, stream it into our isolated `S3StorageProvider` using a `tenantId/recordings/{id}.mp3` path, and update the Prisma record. Access is implicitly protected by Phase A.4 presigned URL generation.

---

## 5. Billing Preparation
To properly monetize the Telephony layer, the architecture demands exact tracking of usage:
1. **`VOICE_MINUTES`**: Calculated from Twilio's `durationSeconds` at the end of the `COMPLETED` webhook callback.
2. **`RECORDING_STORAGE`**: Calculated directly from the final `sizeBytes` generated during the S3 upload phase.

These will be created as `UsageEvent` payloads immediately after the relevant webhooks are processed, allowing the future Billing module to accurately meter charges per tenant.
