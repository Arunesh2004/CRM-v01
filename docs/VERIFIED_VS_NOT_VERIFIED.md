# Verified vs Not Verified (Phase R.25)

## ✅ VERIFIED (Runtime Proof Exists)
* **Hybrid Provisioning**: Script execution verified `ensureUserProvisioned` creates complete tenant schemas.
* **Lead Creation**: Script execution verified `createLead` transaction insertion.
* **Reporting Metrics**: Script execution verified `getSecurityMetrics` returns aggregated JSON objects.

## ⚠️ PARTIALLY VERIFIED (Runtime Proof Exists, but mocked or limited scope)
* **Camera Registration**: Script executed `createCamera` and database threw `Error: Location not found`. Proves the validation constraints exist, but misses complete insertion logic.
* **AI Assistant**: Script executed `askAssistant`. It successfully runs but returns a mocked string instead of integrating with Gemini/OpenAI.

## ⛔ BLOCKED (Execution Prevented by External Factor)
* **Authentication UI**: Clerk Bot Protection prevents E2E execution.

## ❌ FAILED (Runtime Proof of Failure Exists)
* **Telephony Initiation**: `createCall` threw `PrismaClientKnownRequestError: Foreign key constraint violated`.
* **Billing Subscriptions**: `createSubscription` threw `PrismaClientValidationError` in query argument formatting.
* **Incident Creation**: `createIncident` threw `PrismaClientValidationError: Argument 'tenant' is missing`.

## ❓ NOT VERIFIED (Feature Missing / No Runtime Attempt)
* **Missing Features**: CCTV RTSP Streaming, AI Call Summary, LiveKit Integrations, Voice Conferencing. These were marked Not Verified because AST mapping proved the entry points completely do not exist.
* **Unexecuted Features**: CRM Updates, Soft Deletes, Exports, Webhooks. These exist in AST but were not executed in the targeted happy-path scripts.
