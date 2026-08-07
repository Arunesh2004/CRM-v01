# Feature Verification Matrix (Phase R.25)

**Date**: 2026-08-06

| Category | Feature | Status | Reason / Evidence |
| :--- | :--- | :--- | :--- |
| **Security** | Authentication | ⛔ BLOCKED | Playwright blocked by Bot Protection. |
| **Security** | Provisioning | ✅ VERIFIED | `ensureUserProvisioned` ran and inserted tenant. |
| **Security** | Tenant Isolation | ✅ VERIFIED | `ensureUserProvisioned` assigned `TENANT_ADMIN` role correctly. |
| **CRM** | Lead Creation | ✅ VERIFIED | `createLead` inserted successfully. |
| **CRM** | Customer Conversion | ❓ NOT VERIFIED | Based on AST inventory, `convertLeadToCustomer` exists but was not executed. |
| **Telephony** | Call Initiation | ❌ FAILED | `createCall` throws `CallParticipant_contactId_fkey` constraint failure. |
| **Telephony** | AI Summary | ❓ NOT VERIFIED | Feature Missing. AST proves function does not exist. |
| **CCTV** | Camera Registration | ⚠️ PARTIALLY VERIFIED| `createCamera` throws `Location not found`. Constraint validation works. |
| **CCTV** | Stream Playback | ❓ NOT VERIFIED | Feature Missing. AST proves function does not exist. |
| **Incident** | Incident Generation | ❌ FAILED | `createIncident` throws `tenant is missing` schema error. |
| **Billing** | Subscriptions | ❌ FAILED | `createSubscription` throws `PrismaClientValidationError` in `findUnique` query. |
| **Reporting** | Dashboard KPIs | ✅ VERIFIED | `getSecurityMetrics` executed and returned valid JSON. |
| **Reporting** | Export CSV | ❓ NOT VERIFIED | `getIncidentsCsv` exists in AST but not executed. |
| **AI** | Prompt Execution | ⚠️ PARTIALLY VERIFIED| `askAssistant` executed but logs confirm it is intentionally mocked. |
