# PHASE 15B — CLERK AUTHENTICATION ARCHITECTURE & RESOLUTION

## 1. Root Cause of 429
The application middleware `src/middleware.ts` configured the `/sign-in` and `/sign-up` paths to be rate-limited by the `rateLimiters.auth` bucket (10 requests per minute). Clerk makes multiple sub-requests during initialization (for JS chunks and Clerk APIs). This caused the 10 request limit to be exhausted before the page could finish rendering, triggering an HTTP 429 "Too Many Requests" response from the CRM middleware, completely blocking the frontend UI from rendering.

## 2. Files Changed
- `src/middleware.ts` 
  - **Change 1:** Modified the `handleRateLimiting` function to explicitly skip application-level rate limiting for `/sign-in`, `/sign-up`, and `/__clerk` paths. DDoS protection for these endpoints is correctly delegated to Clerk's infrastructure.
  - **Change 2:** Renamed `middleware.ts` to `proxy.ts` to fix a Next.js 16.3.5 build error `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
  - **Change 3:** Updated the `event: any` parameter to `event: NextFetchEvent` to resolve an existing ESLint error.

## 3. Tests Run & Results
- **TypeScript Check**: `npx tsc --noEmit` → PASS
- **ESLint**: `npx eslint src/proxy.ts` → PASS (0 errors, `any` type fixed)
- **Production Build**: `npm run build` → PASS (Route table successfully compiled and `Proxy (Middleware)` was successfully registered)

## 4. Deployment Commit
- Commit: `4937d9c` (Pushed to `main`)

## 5. Hosted /sign-in Result
- The `/sign-in` endpoint now safely bypasses the internal 10 req/minute rate limit bucket. It correctly loads the Clerk UI without hitting a 429 block.
- Protected routes (e.g. `/dashboard`) continue to redirect to `/sign-in` properly.
- Rate limiting for API, webhooks, billing, and AI remains fully active.

## 6. Onboarding Architecture (Company / Admin / Employee)
The current Clerk + CRM integration architecture works as follows:

1. **Company Provisioning**: A company/tenant is created in the CRM database.
2. **User Creation**: A CRM user record is created in the DB with status `INVITED`, linked to the company's `tenantId`, and assigned a specific role (Admin or Employee).
3. **Invitation Dispatch**: The CRM sends a secure invitation token link to the user (`/accept-invite?token=...`).
4. **Clerk Sign-Up**: The user visits the link. If not authenticated, they are prompted to create a Clerk account using that email address. 
5. **Webhook Evasion**: When the Clerk `user.created` webhook fires, the CRM checks the DB. Because the user is `INVITED`, the webhook intentionally ignores them (they must complete the token flow).
6. **Token Redemption**: The `/api/auth/accept-invite` endpoint verifies the secure token, marks the DB user as `ACTIVE`, and binds the new `clerkId` to the pre-existing user record.
7. **CRM Session**: Subsequent CRM requests call `requireAuth()`, which looks up the DB user by `clerkId`, seamlessly providing the `tenantId` (for DB RLS) and `userRoles` (for permission checks).

## 7. Architectural Gaps
- **Architecture is SOUND**: The existing architecture strictly separates Identity (Clerk) from Authorization/Tenancy (CRM DB). 
- **Employee Creation**: The Admin → Employee creation flow is fully supported by the architecture and database schema. Employee creation simply generates an `INVITED` user record and dispatches a token.
- **No Shared Passwords**: The architecture successfully avoids shared CRM passwords. All users own their Clerk credentials.

## 8. Multi-Tenant Security & Isolation
- **Tenant Derivation**: Tenant context is ALWAYS derived server-side from the authenticated database identity (`requireTenant()`). It cannot be spoofed by a browser cookie or URL param.
- **Verification Status**: Multi-tenant isolation and Employee RBAC boundaries are currently **CODE-VERIFIED**. Because the `x-load-test-token` is permanently disabled in production (which is correct), automated bots cannot spoof an authenticated session. 
- **Requirement**: The Admin/Employee boundaries must be physically verified by a human operator using the approved checklist (`PHASE_15B_HUMAN_VERIFICATION_CHECKLIST.md`).
