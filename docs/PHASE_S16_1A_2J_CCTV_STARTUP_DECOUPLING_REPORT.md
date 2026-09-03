# PHASE S16.1A.2J — CCTV Startup Decoupling Report

## 1. Objective
Refactor environment validation so that CCTV/MediaMTX is an OPTIONAL/DEGRADABLE integration, allowing the core CRM to boot securely without MediaMTX infrastructure, while preserving fail-closed security when CCTV is configured.

## 2. Root Cause
`validateEnvironment()` in `src/lib/config/env.ts` treated `CCTV_STREAM_JWT_SECRET`, `CCTV_OPAQUE_PATH_SECRET`, `MEDIAMTX_API_URL`, `MEDIAMTX_WEBHOOK_SECRET`, and `PUBLIC_APP_URL` as globally mandatory variables, causing `instrumentation.ts` to throw a `CRITICAL STARTUP FAILURE` and returning HTTP 500 across all CRM routes when MediaMTX was unprovisioned.

## 3. Architecture Before
The monolith failed to start completely if any CCTV module environment variable was missing. `ENV` getters returned variables with non-null assertions (`!`), exposing the application to runtime failures or insecure fallback behaviors if the initialization checks were simply removed without proper configuration boundaries.

## 4. Architecture After
`src/lib/config/env.ts` has explicitly decoupled "Core Global Variables" (Database, Clerk, Encryption) from "CCTV Variables". A new configuration state property, `ENV.cctvEnabled`, establishes a clear configuration boundary. The CRM boot succeeds even when CCTV variables are missing.

## 5. Configuration States
*   **CCTV Absent**: Core CRM boots successfully. `ENV.cctvEnabled` is `false`. A log message is emitted indicating CCTV is disabled.
*   **CCTV Partial/Invalid**: Core CRM boots successfully. `ENV.cctvEnabled` is `false`. A console warning is logged safely indicating incomplete CCTV configuration, and CCTV features are disabled.
*   **CCTV Fully Configured**: `ENV.cctvEnabled` is `true`. Existing CCTV behavior runs as before.

## 6. Security Analysis
CCTV security remains strictly fail-closed:
*   **No configuration bypass**: If `ENV.cctvEnabled` evaluates to `false`, attempting to access `ENV.cctvStreamJwtSecret`, `ENV.mediamtxWebhookSecret`, or `ENV.mediamtxApiUrl` throws a runtime `Error('CCTV module is disabled: missing required configuration')`.
*   **No JWTs minted**: The stream service's token generation explicitly throws an error attempting to access the missing configuration, preventing unauthorized streams.
*   **No Webhook authentication bypass**: `api/webhooks/mediamtx/auth` returns HTTP 503 safely.
*   **No Default fallbacks**: No default `http://localhost:3000` or fake configurations were introduced to "mock" MediaMTX in production.

## 7. Health Endpoint Behavior
Health and liveness endpoints (`/api/health/live` and `/api/health/ready`) do not depend on CCTV secrets and therefore correctly report `status: 'ok'` or `status: 'ready'` even when CCTV is disabled.

## 8. Tests Added/Updated
Added `src/tests/security/s16-1a-2j-cctv-startup-decoupling.test.ts` to test the state machine.
Updated tests to use Vitest.

## 9. Verification Pass
*   **Typecheck**: PASS (`tsc --noEmit`).
*   **Production Build**: PASS (`npm run build`).
*   **Targeted CCTV Tests**: PASS (Decoupling logic verified).
*   **Health Endpoint**: PASS.
*   **Disabled CCTV Route Behavior**: PASS (Returns HTTP 503 instead of 500 crashes).
*   **Webhook Behavior**: PASS (Returns HTTP 503 instead of processing requests).
*   **Stream JWT Behavior**: PASS (Throws `CCTV module is disabled`).
*   **MediaMTX API Behavior**: PASS (Cron invalidations and helpers explicitly check `ENV.cctvEnabled` before executing fetch operations).

## 15. Security Test Reconciliation

**Test Suite**: `src/tests/security/cctv-stream-integration.test.ts`
*   **Original Purpose**: Verify WebRTC stream JWT signing, authorization boundaries, and webhook behavior.
*   **Failure Reason**: Failed with `CCTV module is disabled` because the test fixture only mocked 4 of the 5 required variables (`CCTV_OPAQUE_PATH_SECRET` and `PUBLIC_APP_URL` were missing).
*   **Classification**: EXPECTED ARCHITECTURE CHANGE (The strict fail-closed boundary worked exactly as designed when encountering partial configurations).
*   **Final Result**: FIXED TEST FIXTURE (Updated the mock to include all 5 required deterministic test variables, tests now pass).

**Test Suite**: `src/tests/security/cctv-tenant-isolation.test.ts`
*   **Original Purpose**: Verify that tenants cannot access each other's cameras or issue invalid opaque paths.
*   **Failure Reason**: 1. Failed with `CCTV module is disabled` (same as above). 2. Legacy assertions checking for the string `Cross-tenant access denied` failed because a previous security remediation phase updated the `requireRelationOwnership` error message to `Invalid or unauthorized reference`.
*   **Classification**: EXPECTED ARCHITECTURE CHANGE.
*   **Final Result**: FIXED TEST FIXTURE (Mocked `cctvEnabled: true` and updated the regex assertion to match the new relation error string).

## 16. Final Verification Status
*   **Typecheck**: PASS
*   **Production Build**: PASS
*   **S16.1A.2J Tests**: PASS
*   **Relevant CCTV Security Tests**: PASS (Reconciled and Green)
*   **Unresolved Security Regressions**: NONE

The CCTV Decoupling Architecture is verified safe, strictly fail-closed, and production ready.
