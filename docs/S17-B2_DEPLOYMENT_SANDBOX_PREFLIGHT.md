# S17-B2 DEPLOYMENT-LEVEL SANDBOX PREFLIGHT

## 1. Vercel Environment Topology
The deployment configuration utilizes Vercel's standard environments (Preview, Staging, Production). Environment files (`.env.preview`, `.env.staging`, `.env.production`) exist locally, but Vercel CLI intentionally masks sensitive variables with `"[SENSITIVE]"` to protect credentials. 
- The environments are conceptually separated.
- Actual destinations and scopes of the `[SENSITIVE]` credentials are fundamentally opaque from the local repository.

## 2. Safe Deployment Target
**No safe deployment target can be positively established from the codebase alone.**
Because the actual values of `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and other endpoints are obfuscated, we cannot programmatically prove that the Vercel "Staging" or "Preview" environments point to isolated, non-production resources rather than Production itself.
- **Classification:** BLOCKED — SAFE SANDBOX TARGET NOT ESTABLISHED.

## 3. Provider Environment & Destination Classification
Without decrypted visibility into the Vercel secret store, all provider destinations are strictly unverifiable. Furthermore, several communication providers are entirely missing from the Staging configuration.

| Provider | Preview/Staging Configured | Destination Known | Sandbox/Test Resource | Safe Operation | Side Effect | Can test? |
|---|---|---|---|---|---|---|
| **Clerk** | YES | NO (DESTINATION UNVERIFIED) | UNKNOWN | Validate JWKS | READ-ONLY | NO |
| **Supabase/Postgres**| YES | NO (DESTINATION UNVERIFIED) | UNKNOWN | `SELECT 1` | READ-ONLY | NO |
| **Upstash Redis** | YES (`REDIS_URL` only) | NO (DESTINATION UNVERIFIED) | UNKNOWN | Ping | READ-ONLY | NO |
| **Resend** | NO | NO (NOT CONFIGURED) | ABSENT | None | FORBIDDEN | NO |
| **Twilio** | NO | NO (NOT CONFIGURED) | ABSENT | None | FORBIDDEN | NO |
| **WhatsApp/Meta** | NO | NO (NOT CONFIGURED) | ABSENT | None | FORBIDDEN | NO |
| **Pusher** | NO | NO (NOT CONFIGURED) | ABSENT | None | FORBIDDEN | NO |
| **S3/R2** | NO | NO (NOT CONFIGURED) | ABSENT | None | FORBIDDEN | NO |
| **MediaMTX** | NO | NO (NOT CONFIGURED) | ABSENT | None | FORBIDDEN | NO |
| **Inngest** | NO | NO (NOT CONFIGURED) | ABSENT | None | FORBIDDEN | NO |
| **Gemini** | YES | NO (DESTINATION UNVERIFIED) | UNKNOWN | Health Check | READ-ONLY | NO |

## 4. Database Isolation Assessment
- The `DATABASE_URL` in Staging/Preview is configured, but its value is `[SENSITIVE]`. 
- **Safety Rule:** We cannot prove it does not point to Production. 
- **Result:** NO MUTATING TESTS are permitted. Even read-only checks are risky if they generate load on Production, but without knowing the host, it must be treated as Production.

## 5. CCTV Infrastructure Assessment
- There is no isolated MediaMTX environment configured in `.env.staging` or `.env.preview`. 
- **Result:** CCTV integration is purely EXTERNAL DEPENDENCY BLOCKED. No test stream can be executed.

## 6. Communication Sandbox Assessment
- Twilio, Resend, and WhatsApp are explicitly configured in `.env.production`, but are entirely absent from the `[SENSITIVE]` `.env.staging` pull.
- **Result:** Staging is completely incapable of performing communication delivery. If it attempts to inherit variables, it inherits Production keys, which is inherently **NOT SAFE**.

## 7. Safe Test Operations & Side-Effect Classification
*See Matrix in Section 3.* No operation is genuinely safe to execute against an unverified destination. Any payload sent to an unknown host poses a potential real-world side effect or data leakage.

## 8. Webhook Safety
Synthetic webhook testing (e.g., simulating a Twilio SMS receipt) relies on testing the local/staging endpoints. However, because the staging `DATABASE_URL` is unverified, mutating local/staging data via a webhook test risks mutating Production data. Therefore, **webhook testing that involves database writes is not safe**.

## 9. Production Safety Confirmation
- Production credentials were not exposed, printed, or bypassed.
- No remote provider (staging or production) was invoked.
- No source code was modified.
- All environment masking (`[SENSITIVE]`) was respected.

## 10. Final Preflight Classification
**EXTERNAL DEPENDENCY BLOCKED / SAFE SANDBOX TARGET NOT ESTABLISHED**
Because the deployment target's isolation cannot be cryptographically or visually proven from the local agent's perspective, running S17-B2 integration tests against it is a violation of the Production Boundary rules.

## Recommended Execution Order (If Unblocked)
*This cannot commence until an isolated environment is proven.*
1. Database read-only connection check (`SELECT 1`).
2. Redis `PING`.
3. Clerk JWKS validation.
4. Gemini non-sensitive health prompt.
5. Synthetic Webhooks (auth signatures only, no DB writes).
