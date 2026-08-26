# PHASE 13.4 — PRE-IMPLEMENTATION READINESS REPORT

## 1. Executive Summary
Phase 13.4 focuses on processing completed voice calls to generate asynchronous audio transcriptions and AI-driven summarizations using background workers. The goal is to safely extract value from call recordings without blocking the main web server, while adhering strictly to the established RLS tenant isolation model.

## 2. Historical Development Timeline
- **Phase 12.3:** Database RLS Migration (established 42 protected tables).
- **Phase 13.1A:** Status Webhook Security Patching (secured `status/route.ts` from payload forgery).
- **Phase 13.2:** Realtime Voice WebSocket Bridge (established Twilio secure streaming context).
- **Phase 13.3:** AI Audio Processing (established Realtime Gemini Live API integration).
- **Phase 13.4 (Pending):** Async Transcriptions & Summarizations via background workers.

## 3. Original Phase 13.4 Definition
From `docs/PHASE_13_ARCHITECTURE_SECURITY_AUDIT.md`:
> "Phase 13.4: Async Transcriptions & Summarizations (Background workers)."

## 4. Current Phase 13.4 Definition
The current definition remains exactly the same as the original. The implementation involves:
1. Hooking into the secure `src/app/api/webhooks/twilio/status/route.ts` when a call is `completed`.
2. Emitting an asynchronous event (e.g., via `EventOutbox` as defined in Phase 9).
3. Developing a background worker to fetch the recording, generate a transcript, generate a summary, and securely update the `CallLog` metadata using the existing `requestAITranscript`, `completeAITranscript`, `requestAISummary`, and `completeAISummary` service stubs.

## 5. Changes From Original Plan
None. The plan is highly consistent with both the Phase 13 architecture audit and the Phase 9 async implementation strategy.

## 6. Phase 13.4 Requirements
- **Trigger:** Webhook completion status must queue a job.
- **Background Processing:** An asynchronous worker must process the job without blocking HTTP requests.
- **Audio Retrieval:** Retrieve the recording audio file for processing.
- **Transcription:** Convert the audio to text.
- **Summarization:** Use an LLM to summarize the text and derive sentiment.
- **Storage Strategy:** Transcripts must be stored externally (e.g., S3/R2), not directly in the PostgreSQL `CallLog` to prevent database bloat.
- **Tenant Isolation:** The worker must securely bind to the correct `tenantId` using `withTenant(tenantId)` to prevent cross-tenant leakage.

## 7. Current Implementation Readiness
- `requestAITranscript` / `requestAISummary` stubs: ✅ **READY** (Present in `telephony.service.ts`).
- Secure webhook entrypoint: ✅ **READY** (`status/route.ts` patched in 13.1A).
- Transactional Outbox Pattern: ✅ **READY** (Established in Phase 9).
- LLM Summarization: ✅ **READY** (Gemini text provider is fully implemented).
- Twilio recording retrieval: 🟡 **PARTIALLY READY** (Requires credentials for real usage).
- Audio transcription provider: 🔴 **MISSING** (No offline batch audio-to-text mechanism is currently implemented; Gemini File API or Deepgram is required).
- External Storage: 🔴 **MISSING** (AWS/S3 credentials and implementation are missing).

## 8. Dependencies
- **Phase 13.1A Webhook Security:** REQUIRED. STATUS: Complete. BLOCKING: No.
- **Phase 9 Async Outbox:** REQUIRED. STATUS: Complete. BLOCKING: No.
- **AI Text Generation:** REQUIRED. STATUS: Complete. BLOCKING: No.
- **Storage Integration:** REQUIRED (per `telephony.service.ts` rules). STATUS: Missing. BLOCKING: Yes.

## 9. Credentials
- **GEMINI_API_KEY**: Available (REAL). Secure. Used for summarization.
- **TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN**: Missing. Required if fetching real recordings.
- **AWS_ACCESS_KEY_ID / SECRET**: Missing. Required if saving real transcripts to external storage.

## 10. Real vs Demo Services
- **Gemini Text Generation:** REAL / MOCK (Both available and production ready).
- **Audio Transcription:** UNKNOWN (Not implemented).
- **Twilio Fetch:** MOCK (Current implementation relies on mock attachments).
- **External Storage:** MOCK (Current stubs save dummy `s3://` URLs).

## 11. Security Requirements
- The `status` webhook must continue to ignore any URL-provided `tenantId` and derive it exclusively from the cryptographic `CallSid` mapping.
- Background workers must NEVER execute as system for mutations. They must establish context via `withTenant(tenantId)`.

## 12. Tenant / Company Isolation
- Asynchronous tasks must receive a trusted `tenantId` from the securely authenticated enqueueing boundary.
- All database updates must include `where: { id: callId, tenantId }`.

## 13. Performance / Scalability Requirements
- The implementation must respect serverless timeouts (e.g., Vercel's 10s-60s limit). If transcription downloads are large, the background worker architecture (Inngest) handles retries, but memory/timeout constraints must be considered.
- Transcripts absolutely must NOT be stored in `CallLog.metadata` strings.

## 14. Testing Requirements
- Unit tests for the summarization logic.
- Integration tests ensuring the webhook properly queues the `EventOutbox` record.
- Security adversarial tests ensuring forged jobs cannot be queued for other tenants.

## 15. Existing Regression Baseline
- **Root CRM tests:** 199 / 199 PASS
- **Voice Bridge:** 25 / 25 PASS
- **TypeScript:** PASS
- **Build:** PASS

## 16. Known Risks
- Large audio file downloads and processing inside serverless functions often lead to Out Of Memory (OOM) or timeout errors.

## 17. Known Technical Debt
- `status/route.ts` mentions deduplication via `WebhookEvent` on line 46, but it is currently just a comment. This must be implemented to prevent processing the same audio twice if Twilio retries the webhook.

## 18. Missing Items
- Twilio API credentials.
- AWS / S3 storage credentials.
- Decision on which API to use for batch audio transcription.

## 19. Blocking Items
- It is UNDEFINED whether Phase 13.4 should implement fully REAL external services (Twilio HTTP fetches + AWS S3 uploads + Deepgram/Gemini File API) or if it should utilize MOCK providers, given the current `.env` lacks these credentials.

## 20. Non-Blocking Items
- Summarization can be built immediately using the existing Gemini text provider.

## 21. Proposed Implementation Sequence
1. Implement `WebhookEvent` deduplication in `status/route.ts`.
2. Update `status/route.ts` to insert into `EventOutbox` for background processing.
3. Create the background worker for transcriptions/summaries.
4. Integrate the chosen storage/transcription provider (Real or Mock).
5. Write corresponding security and integration tests.

## 22. Acceptance Criteria
- A completed Twilio call reliably triggers a background transcription and summarization job.
- Results are securely attached to the correct tenant's `CallLog`.
- The database does not store the raw transcript text directly.
- The 199 existing security and functionality tests continue to pass.

## 23. Explicit Non-Goals
- Real-time streaming audio transcription is out of scope (handled in 13.3).
- Building an in-house audio transcriber.

## 24. Final Readiness Verdict
**YELLOW — READY AFTER SPECIFIC BLOCKERS ARE RESOLVED**
The architecture and internal prerequisites are perfectly aligned. However, clarification is required on external service usage (MOCK vs REAL storage/transcription/Twilio fetch) before writing code, as the required credentials do not exist in the current environment.
