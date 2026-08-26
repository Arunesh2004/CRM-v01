# PHASE 13.4 FINAL IMPLEMENTATION BLUEPRINT

## 1. Executive Summary
This document serves as the final, verified implementation plan for Phase 13.4: Async Transcriptions & Summarizations. The architecture has been rigorously audited against the current repository state and external provider API specifications. The selected stack relies on Twilio for recording retrieval, Gemini 1.5 File API for one-pass transcription/summarization, and Cloudflare R2 for zero-egress transcript storage, coordinated by the CRM's native EventOutbox pattern.

## 2. Verified Current Architecture
The current repository architecture is fully capable of supporting Phase 13.4 without major modifications:
- **`EventOutbox`**: Already exists in `schema.prisma` with robust `eventId` uniqueness.
- **`CallLog`**: Contains a `metadata` JSON field, perfectly suited for storing `transcriptStatus` and the `transcriptUrl` reference.
- **`outbox.worker.ts`**: The Phase 9 async infrastructure is present and capable of picking up `CALL_COMPLETED` events.
- **Provider Abstractions**: `TelephonyProvider` and `AIProvider` exist.

## 3. Gemini Audio API Verification
- **Current Model**: `gemini-1.5-flash` or `gemini-1.5-pro` natively supports audio understanding.
- **API Version**: `v1beta` (or standard `v1` where available via SDK).
- **SDK Compatibility**: `@google/genai` v2.16.0 natively supports `client.files.upload()`.
- **Formats & Limits**: Supports WAV, MP3, AAC, PCM. Up to 9.5 hours duration. Files API max file size is 2GB.
- **One-Pass Processing**: Supported. The audio file can be uploaded via the Files API, and a single prompt requesting JSON output (containing both transcription text and summary fields) is highly reliable.
- **Timestamps / Diarization**: Supported natively by Gemini 1.5 for audio, though granular exact word-level timings may require specific prompt instructions.

## 4. Twilio Integration
- **Current Status**: No real credentials exist in `.env`.
- **Recording Fetch**: Twilio's `/Recordings` endpoint requires HTTP Basic Auth. The `TelephonyProvider` will implement this.
- **Webhook**: The `status/route.ts` webhook already receives `CallSid`. If a recording was made, it typically provides a `RecordingUrl`. The background worker will download this via a securely authenticated fetch.

## 5. R2 Integration
- **Current Status**: No real credentials exist.
- **Configuration**: Uses `@aws-sdk/client-s3`. 
- **Endpoint**: `https://<accountId>.r2.cloudflarestorage.com`.
- **Object Key Strategy**: `{tenantId}/transcripts/{callId}.json` ensuring complete tenant path isolation.

## 6. Background Worker
- A new handler function will be added to the existing Outbox worker system.
- It will match `eventType === 'CALL_COMPLETED'`.
- It will fetch the audio buffer from Twilio -> upload to Gemini Files API -> prompt Gemini for JSON -> upload raw transcript to R2 -> update `CallLog.metadata` with the summary and R2 URL.

## 7. Idempotency
- **Schema Validation**: `WebhookEvent` relies on `@@unique([provider, eventId])`. However, Twilio fires multiple statuses for the same CallSid.
- **The True Idempotency mechanism**: The `EventOutbox` table enforces an absolute `@unique(eventId)`.
- **Strategy**: When inserting into `EventOutbox`, the `eventId` will be constructed as `${callSid}_COMPLETED`. If Twilio retries the webhook due to timeout, the second `create` attempt will throw a Prisma `P2002` Unique Constraint violation. The webhook will cleanly swallow this error and return HTTP 200, achieving perfect deduplication.

## 8. Tenant Isolation
- **Webhook Phase**: The Twilio webhook receives an untrusted URL. It uses `executeAsSystem` to map `providerCallId` (CallSid) to the `CallLog` to extract the trusted `tenantId`.
- **Worker Phase**: The job is queued into `EventOutbox` with the trusted `tenantId`. The background worker reads this, and strictly executes its logic inside `withTenant(tenantId)`.

## 9. Security Model
- No raw transcripts will be written to `CallLog.metadata` to prevent database bloat and possible string injection.
- Temporary files/buffers will be handled carefully to avoid Out Of Memory errors.
- R2 objects will be strictly private, only accessible server-side or via authenticated presigned URLs.

## 10. Mock/Demo Architecture
- Because Twilio and AWS credentials are fundamentally missing, the implementation MUST include mock classes.
- **`MockTelephonyProvider`**: Will return a fake audio buffer or generic "mock" response instead of attempting HTTP Basic auth.
- **`MockStorageProvider`**: Will bypass S3 `PutObjectCommand` and return `mock-s3://{tenantId}/transcripts/{callId}.json`.
- **Production Guard**: Mocks are ONLY instantiated if `APP_MODE === 'demo'`. In production, missing credentials throw an explicit startup error.

## 11. Credential Matrix
| Credential | Provider | Purpose | Dev? | Prod? | Available? | Location | Frontend Exposed? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google | AI Transcription | YES | YES | **YES** | `.env` | NO |
| `TWILIO_ACCOUNT_SID` | Twilio | Audio fetch auth | NO | YES | **NO** | `.env` | NO |
| `TWILIO_AUTH_TOKEN` | Twilio | Audio fetch auth | NO | YES | **NO** | `.env` | NO |
| `AWS_ACCESS_KEY_ID` | R2 | S3 Upload | NO | YES | **NO** | `.env` | NO |
| `AWS_SECRET_ACCESS_KEY`| R2 | S3 Upload | NO | YES | **NO** | `.env` | NO |
| `AWS_BUCKET_NAME` | R2 | S3 Upload | NO | YES | **NO** | `.env` | NO |
| `AWS_ENDPOINT_URL` | R2 | S3 API endpoint| NO | YES | **NO** | `.env` | NO |

## 12. Error Handling & Retry Strategy
- If the Gemini API or R2 API fails, the worker throws an error.
- The existing Outbox architecture (or Inngest) automatically retries failed jobs using exponential backoff.
- If the `CallLog` is already marked as `transcriptStatus: 'COMPLETED'`, the worker exits immediately to prevent duplicate billing.

## 13. Scalability
- **Gemini**: 1.5 API supports high concurrency but is subject to RPM limits. The worker should implement rate-limit delays if HTTP 429 occurs.
- **Storage**: R2 scaling is effectively infinite and avoids egress bandwidth costs for the CRM.
- **Web Server**: Backgrounding this task perfectly isolates CPU-heavy operations from the API/WebSocket routes.

## 14. Implementation Dependencies
- `@aws-sdk/client-s3`: Must be installed.
- `@google/genai`: Already available.

## 15. Required Files to Create/Modify
- **Modify**: `src/app/api/webhooks/twilio/status/route.ts` (Add `EventOutbox` queueing).
- **Modify**: `src/modules/communication/telephony/telephony.service.ts` (Implement the stub logic).
- **Create**: `src/lib/storage/providers/r2.provider.ts` or extend existing S3 provider.
- **Create**: `src/modules/communication/jobs/call-transcription.worker.ts`.
- **Modify**: `src/lib/providers/ai/gemini.provider.ts` (Add `transcribeAudio` method utilizing Files API).

## 16. Exact Implementation Order
1. Extend `GeminiProvider` to support audio upload and one-pass processing.
2. Implement S3/R2 storage integration and Mock variants.
3. Update the `status` webhook to safely `upsert` into `EventOutbox` utilizing `eventId: ${callSid}_COMPLETED`.
4. Create the background worker logic binding everything together.
5. Add automated tests.
