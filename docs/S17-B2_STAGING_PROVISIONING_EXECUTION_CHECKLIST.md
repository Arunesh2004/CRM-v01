# S17-B2 STAGING PROVISIONING EXECUTION CHECKLIST

## 1. Minimum Required Infrastructure
The following infrastructure is the strict minimum required to unblock S17-B2 integration tests safely:

- **PostgreSQL/Supabase:** **REQUIRED** (Core for RLS/tenant tests).
- **Clerk:** **REQUIRED** (Core for auth/webhook tests).
- **Vercel Staging:** **REQUIRED** (To host public webhook endpoints securely).
- **Redis (Upstash):** **REQUIRED** (For rate limiting and async context state).
- **Twilio (Sandbox):** **REQUIRED** (If real telephony/SMS validation is explicitly in scope for S17-B2).
- **Resend (Sandbox):** **REQUIRED** (If real email validation is explicitly in scope for S17-B2).
- **Inngest:** **REQUIRED** (If cloud worker validation is explicitly in scope for S17-B2).

## 2. Optional/Deferred Infrastructure
Do not provision these unless explicitly required by a downstream S17-B2 test phase. If deferred, their respective integration tests will be bypassed or stubbed.

- **WhatsApp/Meta:** **DEFERRED** — Not required to unblock core S17-B2.
- **Pusher:** **DEFERRED** — Not required to unblock core S17-B2.
- **S3/R2:** **DEFERRED** — Not required to unblock core S17-B2.
- **MediaMTX:** **DEFERRED** — Not required to unblock core S17-B2.
- **Gemini:** **DEFERRED** — Not required to unblock core S17-B2. (DO NOT use Production Gemini keys).

## 3. Provider-by-Provider Provisioning Instructions

**Operator Action:** Execute these manually in provider dashboards.
1. **Staging Database (Supabase):**
   - Create a genuinely separate Supabase project.
   - Do NOT reuse the Production project.
   - Note the distinct project reference ID.
2. **Staging Clerk:**
   - Create an isolated Development/Test environment (or new App).
   - Ensure webhook targets point to the Vercel Staging URL.
   - Do NOT use Production Clerk.
3. **Staging Redis (Upstash):**
   - Provision a dedicated staging Redis database.
   - Do NOT share Production Redis.
4. **Vercel Staging:**
   - Create/identify the dedicated staging deployment in Vercel.
   - Ensure the deployment has a distinct URL (e.g., `crm-staging.vercel.app`).
5. **Twilio (If required):**
   - Obtain official Twilio Test Credentials (`AC...` Test Account SID) and test numbers.
   - Do NOT use Production credentials or real customer numbers.
6. **Resend (If required):**
   - Use the provider-supported sandbox domain.
   - Confirm recipient restrictions (developer emails only) before saving.
7. **Inngest (If required):**
   - Create a dedicated staging/test Inngest app.
   - Do NOT use Production event keys.

## 4. Vercel Environment Mapping

| Variable | Local/E2E | Staging Scope | Production Scope | Must Differ? | Secret? |
|---|---|---|---|---|---|
| `DATABASE_URL` | Localhost DB | Staging DB | Prod DB | **YES** | YES |
| `DIRECT_URL` | Localhost DB | Staging DB | Prod DB | **YES** | YES |
| `CLERK_SECRET_KEY` | Dev Key | Dev/Test Key | Live Key | **YES** | YES |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Dev Key | Dev/Test Key (`pk_test_`) | Live Key (`pk_live_`) | **YES** | NO |
| `REDIS_URL` | Local/Mock | Staging Redis | Prod Redis | **YES** | YES |
| `TWILIO_ACCOUNT_SID` | Mock | Test SID | Live SID | **YES** | NO |
| `TWILIO_AUTH_TOKEN` | Mock | Test Token | Live Token | **YES** | YES |
| `RESEND_API_KEY` | Mock | Sandbox Key | Live Key | **YES** | YES |
| `INNGEST_SIGNING_KEY`| Local | Staging Key | Live Key | **YES** | YES |

## 5. Secret Handling
- Operator must enter credentials directly into the provider's secure dashboard or the Vercel environment-variable store.
- **NEVER** expose passwords, API keys, tokens, database URLs, webhook secrets, or signing keys to Antigravity.
- **NEVER** create `.env.production.local` with real credentials.
- Reports to Antigravity should contain only: `CONFIGURED`, `NOT CONFIGURED`, `ISOLATED`, `UNVERIFIED`.

## 6. Database Isolation Proof
**Isolation must be established through provider/deployment metadata.**
- Record the distinct Supabase project reference identity (dashboard evidence).
- Record the distinct database resource name.
- Confirm staging-only Vercel environment variables exist.
- *Do NOT create a health endpoint to expose or hash the database connection string.*

## 7. Clerk Isolation Proof
- Confirm the separate Clerk application/instance identity via the dashboard.
- Confirm the staging webhook target matches the staging deployment.
- Record the `pk_test_` publishable key as supporting evidence.

## 8. Provider Isolation Proof
- **Redis:** Dashboard confirms distinct Upstash database instance.
- **Twilio:** Dashboard confirms Test Account SID is in use.
- **Resend:** Dashboard confirms Sandbox/Testing mode is enforced.
- **Vercel:** Dashboard confirms distinct staging URL and non-inherited secret scopes.

## 9. Pre-Test Gates (Must Pass Before Any API Calls)

- [ ] **GATE 1:** Staging Vercel deployment positively identified.
- [ ] **GATE 2:** Staging database positively identified as a different project/resource from Production.
- [ ] **GATE 3:** Staging Clerk application/instance positively identified as non-Production.
- [ ] **GATE 4:** No Production database credentials are present in Staging.
- [ ] **GATE 5:** No Production communication credentials are present in Staging.
- [ ] **GATE 6:** Storage/Pusher/Inngest/MediaMTX resources are either isolated or explicitly deferred.
- [ ] **GATE 7:** All communication test recipients/resources are known to be safe (Sandbox mode).
- [ ] **GATE 8:** Cleanup procedures are scoped to resources created by S17-B2.

**If ANY gate fails, STOP. S17-B2 remains BLOCKED.**

## 10. Operator Evidence Requirements
The operator must provide Antigravity **ONLY** non-secret evidence:
- Staging deployment URL.
- Provider resource/project identifiers (e.g., Supabase project ref, Clerk instance ID).
- Environment classification (Sandbox vs Live).
- Confirmation that Production resources are not being reused.
- *Never provide secret values.*

## 11. Cleanup Requirements
- Cleanup must be explicitly scoped to resources created by S17-B2.
- **Database:** Delete/truncate specific test tenant records generated by the test.
- **Redis:** Delete specific test keys using a staging-specific namespace prefix. *Never use FLUSHALL on shared infrastructure.*
- **Clerk:** Delete specific test users created by the test payload.

## 12. Stop Conditions
- Do NOT provision anything automatically.
- Do NOT modify infrastructure automatically.
- Do NOT make provider calls.
- Do NOT access Production.
- Do NOT run tests immediately after provisioning. A separate `S17-B2 PRE-TEST VERIFICATION` phase must occur first.
