# PRODUCTION CONFIGURATION MASTER MATRIX

| Category | Variable/Dependency | Current Vercel Status | Required for Core? | Safe Demo? | Buyer Provides? | Supported Providers | Notes |
|---|---|---|---|---|---|---|---|
| **Database** | `DATABASE_URL` | CONFIGURED | Yes | No | Yes | PostgreSQL (Neon, AWS, Supabase, etc.) | Standard Prisma connection. Highly portable. |
| **Database** | `DIRECT_URL` | CONFIGURED | Yes | No | Yes | PostgreSQL | Required for migrations. |
| **Database** | `DATABASE_POOLING` | CONFIGURED | No | N/A | No | N/A | Internal toggle. |
| **Auth** | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | CONFIGURED | Yes | No | Yes | Clerk | No safe fallback. Buyer must provide. |
| **Auth** | `CLERK_SECRET_KEY` | CONFIGURED | Yes | No | Yes | Clerk | App crashes on startup if missing. |
| **Auth** | `CLERK_WEBHOOK_SECRET` | CONFIGURED | Yes | No | Yes | Clerk | Protects auth webhook sync. |
| **Encryption**| `ENCRYPTION_KEY` | CONFIGURED | Yes | No | Yes | Agnostic | Cryptographic root for at-rest encryption. |
| **Cache** | `REDIS_URL` | CONFIGURED | No | Yes | Yes | Upstash / Redis | Falls back safely to localhost if missing. |
| **Cache** | `REDIS_MODE` | CONFIGURED | No | N/A | No | N/A | |
| **App** | `COMPANY_TENANT_ID` | CONFIGURED | Yes | No | Yes | Agnostic | Identity boundary for deployment. |
| **App** | `INITIAL_ADMIN_EMAIL` | CONFIGURED | Yes | No | Yes | Agnostic | Bootstraps the first admin account. |
| **App** | `NEXT_PUBLIC_APP_URL` | CONFIGURED | Yes | No | No | Agnostic | Hostname dependency. |
| **Email** | `EMAIL_PROVIDER` | CONFIGURED | Yes | N/A | No (System)| Resend | Determines adapter. |
| **Email** | `RESEND_API_KEY` | NOT CONFIGURED | No | Yes | Yes | Resend | Gracefully degrades if missing. Not required for boot. |
| **SMS** | `SMS_PROVIDER` | CONFIGURED | Yes | N/A | No (System)| Twilio | Determines adapter. |
| **SMS** | `TWILIO_ACCOUNT_SID` | CONFIGURED | No | Yes | Yes | Twilio | Gracefully degrades if missing. Not required for boot. |
| **SMS** | `TWILIO_AUTH_TOKEN` | CONFIGURED | No | Yes | Yes | Twilio | Gracefully degrades if missing. Not required for boot. |
| **SMS** | `TWILIO_WEBHOOK_SECRET` | CONFIGURED | No | N/A | Yes | Twilio | Optional webhooks. |
| **WhatsApp** | `WHATSAPP_PROVIDER` | CONFIGURED | Yes | N/A | No (System)| WhatsApp Business | Determines adapter. |
| **WhatsApp** | `WHATSAPP_TOKEN` | CONFIGURED | No | Yes | Yes | WhatsApp Business | Gracefully degrades if missing. Not required for boot. |
| **WhatsApp** | `WHATSAPP_PHONE_NUMBER_ID` | CONFIGURED | No | Yes | Yes | WhatsApp Business | Gracefully degrades if missing. Not required for boot. |
| **WhatsApp** | `WHATSAPP_WEBHOOK_VERIFY_TOKEN`| CONFIGURED | No | Yes | Yes | WhatsApp Business | Gracefully degrades if missing. Not required for boot. |
| **WhatsApp** | `WHATSAPP_APP_SECRET` | CONFIGURED | No | Yes | Yes | WhatsApp Business | Gracefully degrades if missing. Not required for boot. |
| **AI** | `GEMINI_API_KEY` | CONFIGURED | No | Yes | Yes | Gemini | Optional. Features gracefully degrade. |
| **Storage** | `STORAGE_PROVIDER` | CONFIGURED | No | Yes | No (System)| AWS S3 / R2 | Determines adapter. |
| **Storage** | `AWS_ACCESS_KEY_ID` | NOT CONFIGURED | No | Yes | Yes | AWS S3 / R2 | Gracefully disables storage uploads. |
| **Storage** | `AWS_SECRET_ACCESS_KEY` | NOT CONFIGURED | No | Yes | Yes | AWS S3 / R2 | Gracefully disables storage uploads. |
| **CCTV** | `CCTV_PROVIDER` | CONFIGURED | No | Yes | No (System)| MediaMTX | Determines adapter. |
| **CCTV** | `CCTV_STREAM_JWT_SECRET` | NOT CONFIGURED | No | Yes | Yes | MediaMTX | Safely degrades. |
| **CCTV** | `MEDIAMTX_API_URL` | NOT CONFIGURED | No | Yes | Yes | MediaMTX | Safely degrades. |
| **Voice** | `VOICE_BRIDGE_URL` | NOT CONFIGURED | No | Yes | Yes | Generic WebRTC | Safely degrades if disabled. |
| **Payment** | `PAYMENT_PROVIDER` | CONFIGURED | No | Yes | No (System)| Stripe / Razorpay | Deprecated/Optional in current scope. |

## Summary Totals
- **Total active variables discovered:** 32
- **Configured in Production:** 26
- **Missing:** 6
- **Optional missing:** 6 (AWS Storage, CCTV, Voice, Resend)
- **Core missing:** 0
- **Buyer-provided credentials:** 18 (e.g., keys, URLs, tokens)
- **Demo/Degraded (Graceful):** Cache, AI, Storage, CCTV, Voice, Email, SMS, WhatsApp
- **Blocked (No safe fallback):** Database, Auth, Encryption

## Portability & Architecture Assumptions
- **Hosting:** Fully supported on Vercel. Highly portable to standard Node.js hosting (e.g., Hostinger, AWS EC2, Docker) since Next.js standard builds can run anywhere. Background jobs (Inngest/Cron) may require minor deployment-specific routing, but not a code rewrite.
- **Database:** Highly portable. Auth is handled by Clerk, reducing Supabase coupling to strictly standard PostgreSQL via Prisma. Any PostgreSQL provider works.
- **Providers Supported NOW:** PostgreSQL, Clerk, Redis, Resend, Twilio, WhatsApp, Gemini, MediaMTX, AWS S3.
- **Requires New Adapters:** SendGrid, AWS SES, MessageBird, Auth0, non-S3 storage.

## Final Remediation Complete
- Twilio, WhatsApp, and Resend are NO LONGER enforced as mandatory at startup. The application will log warnings instead of throwing a `CRITICAL STARTUP FAILURE`.
- The communication provider factory intelligently instantiates a mock/degraded provider when credentials are missing.
- When an action is taken using a degraded provider, the application explicitly logs and throws a `PROVIDER_NOT_CONFIGURED` error so no false success signals are recorded.

## FINAL PRODUCT OPERABILITY

**QUESTION:** "Can the current Production project operate safely with the credentials we already have, while missing optional providers are disabled/demo/degraded?"

**ANSWER:** **YES**

**REASON:** The code has been refactored to allow `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, and `WHATSAPP_TOKEN` to be safely absent. Core startup (Database, Auth, Encryption) works normally, while communication features explicitly degrade and warn without crashing the CRM.
