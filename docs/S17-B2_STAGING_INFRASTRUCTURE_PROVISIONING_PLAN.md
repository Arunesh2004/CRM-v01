# S17-B2 STAGING INFRASTRUCTURE PROVISIONING PLAN

## 1. Executive Summary
This document defines the exact architectural design for a secure, isolated non-Production (Staging/Sandbox) environment required to unblock Phase S17-B2. The objective is to design an environment that perfectly mirrors Production capabilities without risking Production data, customer communications, or operational security.

## 2. Current Blocker
- **Blocker:** S17-B2 = BLOCKED — ENVIRONMENT ISOLATION UNVERIFIED.
- **Cause:** Vercel environment masking (`[SENSITIVE]`) prevents local verification of isolation. Furthermore, several critical external providers are absent from the Staging configuration.
- **Resolution:** Explicitly provision and securely verify isolated staging infrastructure before any integration tests proceed.

## 3. Minimum Staging Architecture & 11. Required vs Optional Infrastructure

### REQUIRED (To unblock S17-B2 core paths)
- **Isolated Supabase/PostgreSQL Project:** The CRM heavily relies on database transactions and RLS. A separate staging database is strictly required to run integration tests safely.
- **Isolated Clerk Application/Org:** Required to provision test users and validate auth flows without touching Production users.
- **Staging Vercel Deployment:** Required to host the staging API and Webhooks safely.
- **Isolated Redis (Upstash):** Required for rate limiting and cache state isolation.
- **Safe Test Communication (Twilio/Resend/WhatsApp):** Required for synthetic webhook verification and provider handshake (Sandbox mode only).

### OPTIONAL / DEFERRED (Can remain blocked for S17-B2 if unfeasible)
- **Staging MediaMTX & Storage (CCTV):** The CCTV integration is heavily bounded by the daemon and external infrastructure. While required for full CCTV E2E, S17-B2 can partially proceed on core CRM without it.
- **Inngest:** If Inngest Cloud staging is complex to provision, fallback to local executor is possible.
- **Pusher:** Can use `REALTIME_MODE=demo` fallback if a dedicated staging app is unavailable.
- **Gemini:** AI tests can be stubbed or use a shared key *if* strictly read-only and free of customer data.

## 4. Provider Matrix

| Dependency | Required for S17-B2? | Recommended Resource | Isolation Requirement | Safe Test | Cleanup | Risk |
|---|---|---|---|---|---|---|
| PostgreSQL | REQUIRED | Supabase Free/Staging | Dedicated Project | `SELECT 1`, RLS Auth | Truncate Test Tenants | LOW (if isolated) |
| Clerk | REQUIRED | Clerk Dev Instance | Dedicated Instance | Create test user | Delete test user | LOW (if isolated) |
| Redis | REQUIRED | Upstash Staging DB | Dedicated Database | `PING`, Set short expiry | Key Expiry | LOW |
| Resend | REQUIRED | Resend Sandbox | Sandbox Recipient | Send to test address | None | LOW |
| Twilio | REQUIRED | Twilio Test Account | Test Credentials/Number | Send SMS to test # | None | LOW |
| WhatsApp | REQUIRED | Meta Test App | Test Phone Number | Send to test recipient | None | LOW |
| Pusher | OPTIONAL | Pusher Sandbox App | Dedicated App | Broadcast test event | None | LOW |
| S3/R2 | OPTIONAL | Staging Bucket | Dedicated Bucket | Put test object | Delete object | LOW |
| MediaMTX | OPTIONAL | Dedicated VPS/Container | Dedicated Endpoint | Stream API Status | None | HIGH (if shared) |
| Inngest | OPTIONAL | Inngest Test Env | Test Signing Key | Trigger synthetic event | None | LOW |
| Gemini | OPTIONAL | Gemini Free Tier | Read-Only/Non-Sensitive| Synthetic safe prompt | None | LOW |

## 5. Database Isolation Strategy
**Proof of Isolation:**
- We will verify isolation via the Vercel/Supabase integration dashboard and project reference ID, ensuring it differs completely from the Production project ID. 
- A dedicated staging-only health endpoint can safely return a hashed project identifier to prove isolation during tests.

**Lifecycle:**
- **Schema:** Deploy Prisma schema to the empty staging database.
- **Migration:** Run standard `prisma migrate deploy`.
- **Seed:** Run `seed-demo-tenant` to establish test data.
- **Cleanup:** Drop test tenants after test execution.

## 6. Clerk Isolation Strategy
- Provision a dedicated **Development Instance** in Clerk.
- Use the Development instance's Publishable and Secret keys.
- Create a specific test organization.
- Test webhooks will point to the Vercel Staging deployment URL.
- Test users created during integration tests will be deleted via Clerk Backend API afterward.

## 7. Communication Safety
- **Resend:** Use only verified testing domain or Sandbox mode (which restricts sending to the verified developer email).
- **Twilio:** Use [Twilio Test Credentials](https://www.twilio.com/docs/iam/test-credentials) (e.g., `AC...` / `AuthToken`) and magic test numbers (`+15005550006`).
- **WhatsApp:** Use the Meta App Dashboard "Test Number" feature, bound to a verified developer device only.
- **Safety Guarantee:** Hard block on production routing. No real customer contact is mathematically possible with sandbox credentials.

## 8. CCTV Staging Architecture
- Provision a tiny, disposable container running `aler9/mediamtx`.
- Map an isolated S3 bucket for recording root.
- Use unique `CCTV_OPAQUE_PATH_SECRET` and `CCTV_STREAM_JWT_SECRET`.
- Synthetic stream tests only (e.g., using `ffmpeg` to push a static test pattern).

## 9. Worker / Realtime / Storage Architecture
- **Inngest:** Create a separate staging app in Inngest Cloud. Use a unique Event Key.
- **Pusher:** Create a dedicated "crm-staging" app.
- **Storage:** Create an `s3-crm-staging-bucket`. Apply aggressive lifecycle rules (e.g., delete objects after 1 day).

## 10. Vercel Environment Mapping

| Variable | Preview | Staging | Production | Required Isolation |
|---|---|---|---|---|
| `DATABASE_URL` | Branch DB | Staging DB | Prod DB | STRICT (Separate Project) |
| `CLERK_SECRET_KEY` | Dev Key | Dev Key | Live Key | STRICT (Separate Instance) |
| `REDIS_URL` | Staging Redis | Staging Redis | Prod Redis | STRICT (Separate DB) |
| `TWILIO_ACCOUNT_SID` | Test SID | Test SID | Live SID | STRICT (Test Account) |
| `RESEND_API_KEY` | Sandbox Key | Sandbox Key| Live Key | STRICT (Sandbox only) |
| `PUSHER_APP_ID` | Staging App | Staging App| Prod App | STRICT (Separate App) |
| `GEMINI_API_KEY` | Shared Key | Shared Key | Prod Key | LOW (No PII) |

## 12. Provisioning Order
1. **Supabase Staging Database:** Foundational.
2. **Clerk Dev Instance:** Required for Identity.
3. **Upstash Redis Staging:** Foundational cache.
4. **Vercel Staging Deployment:** Bind 1-3 to the environment and deploy.
5. **Twilio / Resend / WhatsApp Sandboxes:** Bind to staging webhooks.
6. **Inngest / Pusher / S3:** Bind for async/realtime.
7. **MediaMTX:** Most complex, provision last.

## 13. Verification Evidence
To prove infrastructure safety *without* exposing secrets:
- **Database:** Return a masked/hashed Project Reference ID from a secure health endpoint.
- **Clerk:** Verify JWKS endpoint responds to the Staging URL prefix (indicating a `test_` environment).
- **Twilio/Resend:** Execute a synthetic webhook containing a static test signature; log the successful auth validation.
- **Deployment:** Output the `VERCEL_URL` (e.g., `crm-staging.vercel.app`) to prove non-Production origin.

## 14. Security Gates (S17-B2 Pre-Execution)
- [ ] **GATE 1:** Staging deployment URL positively identified.
- [ ] **GATE 2:** Staging DB project ID proven cryptographically distinct from Production.
- [ ] **GATE 3:** Clerk JWKS URL proven to be a Development instance.
- [ ] **GATE 4:** No Production provider credentials inherited by Staging.
- [ ] **GATE 5:** Communication providers explicitly verified as using Test/Sandbox modes.
- [ ] **GATE 6:** Rollback/cleanup procedure documented.

## 15. Cleanup / Rollback
- All users, leads, and tenants generated during S17-B2 must be deleted from the Staging database.
- Object storage (if used) must be wiped.
- Redis keys prefixed with test identifiers must be flushed.

## 16. Remaining External Blockers
- **Infrastructure Provisioning:** None of this infrastructure currently exists or is bound to the Vercel Staging scope. Provisioning must occur (manually by the user) before S17-B2 test execution can safely resume.

---
**PRODUCTION BOUNDARY CONFIRMATION:**
No Production access, database mutation, Clerk mutation, provider calls, or configuration changes occurred during the creation of this architectural design.
