# PRODUCTION VERCEL VARIABLE INVENTORY

## 1. Production Configuration Status & Variable Inventory

The following is an exhaustive audit of the Vercel Production environment variables. The values were inspected securely without exposing secrets.

| Category | Variable | Required? | Production Status | Buyer-Provided? | Safe Demo/Degraded Mode? | Current Behavior |
|---|---|---|---|---|---|---|
| **DATABASE** | `DATABASE_URL` | CORE | CONFIGURED | Yes | No | App crashes on startup if missing |
| **DATABASE** | `DIRECT_URL` | CORE | CONFIGURED | Yes | No | Required for migrations / direct connections |
| **DATABASE** | `DATABASE_POOLING` | OPTIONAL | CONFIGURED | No | N/A | Defaults used if missing |
| **AUTH** | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | CORE | CONFIGURED | Yes | No | App crashes on startup if missing |
| **AUTH** | `CLERK_SECRET_KEY` | CORE | CONFIGURED | Yes | No | App crashes on startup if missing |
| **AUTH** | `CLERK_WEBHOOK_SECRET` | CORE | CONFIGURED | Yes | No | App crashes on startup if missing |
| **ENCRYPTION** | `ENCRYPTION_KEY` | CORE | CONFIGURED | Yes | No | App crashes on startup if missing |
| **CACHE** | `REDIS_URL` | OPTIONAL | CONFIGURED | Yes | Yes | Falls back to localhost if missing |
| **CACHE** | `REDIS_MODE` | OPTIONAL | CONFIGURED | No | N/A | Operational flag |
| **APP** | `COMPANY_TENANT_ID` | CORE | CONFIGURED | Yes | No | Startup validates UUID structure |
| **APP** | `INITIAL_ADMIN_EMAIL` | CORE | CONFIGURED | Yes | No | Used for initial bootstrapping |
| **APP** | `NEXT_PUBLIC_APP_URL` | CORE | CONFIGURED | No | No | Used for absolute URL generation |
| **EMAIL** | `EMAIL_PROVIDER` | CORE | CONFIGURED | No (System) | N/A | Dictates email adapter |
| **EMAIL** | `RESEND_API_KEY` | CORE | NOT CONFIGURED | Yes | No | Code statically enforces this in Production; app startup will fail if truly absent during runtime |
| **SMS** | `SMS_PROVIDER` | CORE | CONFIGURED | No (System) | N/A | Dictates SMS adapter |
| **SMS** | `TWILIO_ACCOUNT_SID` | CORE | CONFIGURED | Yes | No | Enforced in Production config validation |
| **SMS** | `TWILIO_AUTH_TOKEN` | CORE | CONFIGURED | Yes | No | Enforced in Production config validation |
| **WHATSAPP** | `WHATSAPP_PROVIDER`| CORE | CONFIGURED | No (System) | N/A | Dictates WhatsApp adapter |
| **WHATSAPP** | `WHATSAPP_TOKEN` | CORE | CONFIGURED | Yes | No | Enforced in Production config validation |
| **WHATSAPP** | `WHATSAPP_PHONE_NUMBER_ID` | CORE | CONFIGURED | Yes | No | Enforced in Production config validation |
| **WHATSAPP** | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | CORE | CONFIGURED | Yes | No | Enforced in Production config validation |
| **WHATSAPP** | `WHATSAPP_APP_SECRET` | CORE | CONFIGURED | Yes | No | Enforced in Production config validation |
| **AI** | `GEMINI_API_KEY` | OPTIONAL | CONFIGURED | Yes | Yes | Features gracefully disable/degrade |
| **PAYMENT** | `PAYMENT_PROVIDER` | OPTIONAL | CONFIGURED | No (System) | Yes | Dictates billing adapter |
| **PAYMENT** | `STRIPE_MODE` / `RAZORPAY_MODE`| OPTIONAL | CONFIGURED | Yes | Yes | Integration disabled if not fully configured |
| **STORAGE** | `STORAGE_PROVIDER` | OPTIONAL | CONFIGURED | No (System) | Yes | Dictates storage adapter |
| **STORAGE** | `AWS_ACCESS_KEY_ID` | OPTIONAL | NOT CONFIGURED | Yes | Yes | Gracefully disabled |
| **STORAGE** | `AWS_SECRET_ACCESS_KEY`| OPTIONAL | NOT CONFIGURED | Yes | Yes | Gracefully disabled |
| **CCTV** | `CCTV_PROVIDER` | OPTIONAL | CONFIGURED | No (System) | Yes | Dictates CCTV adapter |
| **CCTV** | `CCTV_STREAM_JWT_SECRET` | OPTIONAL | NOT CONFIGURED | Yes | Yes | Feature gracefully disabled if missing |
| **CCTV** | `MEDIAMTX_API_URL` | OPTIONAL | NOT CONFIGURED | Yes | Yes | Feature gracefully disabled if missing |
| **VOICE** | `VOICE_BRIDGE_URL` | OPTIONAL | NOT CONFIGURED | Yes | Yes | Checked via `VOICE_STREAMING_ENABLED` flag |

---

## 2. Core vs Optional Classification

- **CORE — MUST BE CONFIGURED NOW:** `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `ENCRYPTION_KEY`, `COMPANY_TENANT_ID`, `TWILIO_*`, `WHATSAPP_*`.
- **OPTIONAL — SAFE TO LEAVE UNCONFIGURED:** CCTV infrastructure (`MEDIAMTX_*`), AWS Storage credentials, Voice Bridge configurations.
- **BUYER-PROVIDED:** Nearly all provider secrets (Database, Auth, Email, SMS, WhatsApp, AI, Payments, Storage).
- **BLOCKED — NO SAFE FALLBACK:** Resend API Key, Twilio Secrets, WhatsApp Secrets are currently statically enforced in `src/lib/config/env.ts` during Production startup. If these are not provided, the application refuses to boot rather than gracefully degrading. (Note: While Vercel variables exist for Twilio/WhatsApp, `RESEND_API_KEY` was strangely absent in the local `.env.production.local` snapshot, which indicates a discrepancy if the app is currently passing health checks).

---

## 3. Provider Abstraction Status

The codebase successfully implements a deployment-level provider abstraction. This is evidenced by presence of variables like `EMAIL_PROVIDER`, `SMS_PROVIDER`, `WHATSAPP_PROVIDER`, `STORAGE_PROVIDER`, `CCTV_PROVIDER`, and `PAYMENT_PROVIDER`.

**"Any Platform" Requirement Assessment:**
- **SUPPORTED PROVIDERS:** 
  - Auth: Clerk
  - Database: PostgreSQL (Supabase/Neon)
  - Email: Resend
  - SMS: Twilio
  - WhatsApp: WhatsApp Business API
  - AI: Gemini
  - Payments: Stripe, Razorpay
- **PROVIDER-AGNOSTIC CONFIGURATION:** Yes, the architecture supports injecting the chosen provider via the `*_PROVIDER` environment flags.
- **REQUIRES NEW ADAPTER:** A buyer cannot immediately plug in SendGrid, AWS SES, MessageBird, or Auth0 unless the corresponding TypeScript adapter is written to satisfy the internal interface.

---

## 4. Demo / Degraded Capability & "Works Without All Providers"

**Does the application work safely without optional provider credentials?**
Yes. For features like CCTV (`cctvEnabled`) and Voice Streaming (`VOICE_STREAMING_ENABLED`), the application checks for the completeness of the configuration block and securely disables the feature if credentials are absent. It logs a warning (`INFO: CCTV integration is not configured. CCTV features will be disabled.`) and does not crash the server.

**Does it accidentally call a Production fallback provider?**
No. If the feature is disabled, the system does not fallback to developer credentials. It reliably degrades the specific route or subsystem.

**Security Requirement on Missing Credentials:**
Core infrastructure (Auth, Database, Encryption, Tenant Isolation) strictly lacks a "demo" fallback in production, which is exactly correct. The application will aggressively crash (`CRITICAL STARTUP FAILURE`) rather than risk operating with insecure mocks.

---

## 5. Buyer Onboarding Model

To satisfy the architecture, onboarding a new buyer requires:
1. **Isolated Deployment:** Create a dedicated Vercel project/deployment for the client.
2. **Provider Selection:** Configure the `*_PROVIDER` variables (e.g., `EMAIL_PROVIDER="resend"`).
3. **Credential Injection:** securely inject the buyer's specific API keys (`DATABASE_URL`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, etc.) into their isolated environment.
4. **Validation:** The application's `env.ts` guarantees that the environment is frozen and correctly configured at boot time.
5. **Freeze:** The deployment runs strictly using the client's own data silos and billing boundaries.

---

## 6. Missing Configuration & Next Steps

**Missing Configuration Discovered:**
- `RESEND_API_KEY` (Not found in the static `.env.production.local` payload).
- AWS Storage Credentials (Optional).
- CCTV/MediaMTX Credentials (Optional).

**Recommended Next Steps:**
1. **Resolve Discrepancy:** The absence of `RESEND_API_KEY` in the local metadata contradicts the static `env.ts` production enforcement. Validate if Vercel has this key injected out-of-band or if `isProduction` is evaluating differently than expected.
2. **Loosen Static Enforcement (Optional):** If the business intends for a buyer to start using the CRM *before* they configure Twilio/WhatsApp/Resend, the strict `throw new Error(...)` blocks in `src/lib/config/env.ts` must be refactored to allow safe, degraded states for communications.
3. **Provision External Sandbox:** To proceed with functional integration testing (S17-B2), an isolated sandbox infrastructure mirroring this exact production configuration map must be provisioned.

---
**Audit Complete: ZERO source code, test, or migration changes were made.**
  
## 7. See Master Matrix  
Please refer to docs/PRODUCTION_CONFIGURATION_MASTER_MATRIX.md for the final three-way result, portability analysis, and product operability conclusion. 
