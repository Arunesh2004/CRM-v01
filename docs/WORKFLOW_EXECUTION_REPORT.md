# Workflow Execution Report (Phase R.25)

**Date**: 2026-08-06

| Workflow | Entry Point | Result | Status | Evidence | Root Cause |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | UI Playwright Script | Crash `EOF` | ⛔ BLOCKED | Playwright exceptions | Bot Protection |
| **Provisioning** | `ensureUserProvisioned` | Upsert successful | ✅ VERIFIED | API Response ID `94839bd4...` | - |
| **CRM** | `createLead` | Insert successful | ✅ VERIFIED | API Response ID `1b6b8516...` | - |
| **Incident** | `createIncident` | Crash `tenant is missing` | ❌ FAILED | PrismaClientValidationError | Runtime Bug |
| **Telephony** | `createCall` | Crash `Foreign key constraint` | ❌ FAILED | PrismaClientKnownRequestError | Runtime Bug / Mocked |
| **CCTV** | `createCamera` | Rejects missing `locationId` | ⚠️ PARTIALLY VERIFIED | `Error: Location not found` | Tested DB constraints |
| **Billing** | `createSubscription` | Crash `where id is missing` | ❌ FAILED | PrismaClientValidationError | Runtime Bug |
| **Reporting** | `getSecurityMetrics` | Metric JSON returned | ✅ VERIFIED | `{ total: 0, open: 0, ... }` | - |
| **AI** | `askAssistant` | Mock String returned | ⚠️ PARTIALLY VERIFIED | `[MOCK AI] Received prompt` | Feature Mocked |
