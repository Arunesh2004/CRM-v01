# Enterprise Runtime Audit (Phase R.25)

**Date**: 2026-08-06
**Methodology**: Exhaustive AST extraction (FEATURE_INVENTORY.md) mapped to runtime test suites verifying exact entry points.

## 1. Authentication & Security
* **User Provisioning**: `✅ VERIFIED`
  * *Entry Point*: `ensureUserProvisioned()`
  * *Evidence*: Executed successfully. Returned `{ id: "94839bd4...", clerkId: "r25_user", tenantId: "3de62670..." }`.

## 2. CRM
* **Lead Creation**: `✅ VERIFIED`
  * *Entry Point*: `createLead()`
  * *Evidence*: Executed successfully in previous phase. Returned `{ id: "1b6b8516..." }`.
  
## 3. Incident Management
* **Incident Creation**: `❌ FAILED (Runtime Bug)`
  * *Entry Point*: `createIncident()`
  * *Evidence*: PrismaClientValidationError: Argument `tenant` is missing. The `tx.incident.create()` query syntax is incorrect.

## 4. Communication & Telephony
* **Telephony Initiation**: `❌ FAILED (Database Constraint / Mocked)`
  * *Entry Point*: `createCall()`
  * *Evidence*: Stack trace generated: `PrismaClientKnownRequestError: Foreign key constraint violated on CallParticipant_contactId_fkey`. Furthermore, no Twilio/LiveKit provider implementation exists.
* **Recording, Summary, Conferencing**: `❓ NOT VERIFIED (Feature Missing)`
  * *Evidence*: The `FEATURE_INVENTORY.md` proves no functions exist in the `telephony.service.ts` or related files to execute these features.

## 5. CCTV
* **Camera Registration**: `⚠️ PARTIALLY VERIFIED (Validation Works)`
  * *Entry Point*: `createCamera()`
  * *Evidence*: Throws `Error: Location not found` when tested with invalid location ID, proving constraints are active.
* **Stream Playback & RTSP Ingestion**: `❓ NOT VERIFIED (Feature Missing)`
  * *Evidence*: AST Extraction proves no functions exist in the entire module to retrieve or process RTSP streams.

## 6. AI Assistant
* **Prompt Processing**: `⚠️ PARTIALLY VERIFIED (Feature Mocked)`
  * *Entry Point*: `askAssistant()`
  * *Evidence*: Executed successfully. The service intercepted the prompt and returned: `"You have a total of 0 incidents. Currently, 0 are open and 0 are critical. 0 have been resolved."` Logs showed `{"level":"info","message":"[MOCK AI] Received prompt:"}`. No external LLM (Gemini/OpenAI) is invoked.

## 7. Reporting
* **Security Metrics**: `✅ VERIFIED`
  * *Entry Point*: `getSecurityMetrics()`
  * *Evidence*: Executed successfully. Returned JSON payload: `{ total: 0, open: 0, investigating: 0, resolved: 0, critical: 0 }`.

## 8. Billing
* **Subscription Management**: `❌ FAILED (Runtime Bug)`
  * *Entry Point*: `createSubscription()`
  * *Evidence*: Throws `PrismaClientValidationError` due to missing `where: { id }` arguments in the Prisma query.
