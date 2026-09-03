# PHASE S16.1A.2L — Production Auth Blocker Forensic Report

## 1. Production Baseline

- **commit**: bb6c9b2da902954b5f7b33ca3ca29441faf30794
- **deployment**: crm-v01.vercel.app
- **health**: HTTP 200 (Live & Ready)
- **Redis**: OK
- **Postgres**: OK
- **Clerk proxy**: Operational (`/__clerk` rewrite successful)

## 2. Test Account Provenance

The predefined test account (`crm-phase1-admin-test@canonical.com`) originates from the E2E testing infrastructure. Specifically, it is hardcoded in `e2e-playwright.spec.ts` for use against a preview deployment URL (`https://crm-v01-bb2k4wja4-arunesh-s-projects.vercel.app`). 
It was never provisioned in the Production Clerk user pool via a seed script or migration. The `tryLoadTestIdentity` and `tryLoadTestIdentityLight` mechanisms in `src/lib/auth.ts` explicitly disable test authentication in the `production` environment. 
Conclusion: The test account is not expected to exist in Production. This is an expected environment gap.

## 3. Clerk Environment Architecture

The Production environment requires both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (configured in Vercel). The codebase enforces their presence during build and runtime. 
Production uses a dedicated "Live" Clerk instance (`pk_live_...`), whereas development/preview relies on a "Test" instance (`pk_test_...`). Users, OAuth configurations, and sessions are fundamentally isolated between these instances.

## 4. Notifications Route Trace

When an unauthenticated user requests `/notifications`, the request is intercepted by `src/proxy.ts` (the Next.js middleware). 
Because `/notifications` is not listed in `isPublicRoute`, the middleware calls `auth.protect()`. 
`auth.protect()` determines the user is unauthenticated and issues an HTTP 307 Temporary Redirect to the configured sign-in route (`/sign-in`), preserving the original requested path in the `redirect_url` query parameter.

## 5. Fresh Browser Reproduction

A fresh, unauthenticated browser context simulating a user visit confirmed the following redirect chain:
1. `GET https://crm-v01.vercel.app/notifications`
2. `307 Temporary Redirect` -> `Location: /sign-in?redirect_url=https%3A%2F%2Fcrm-v01.vercel.app%2Fnotifications`
3. Landing Page: Clerk Sign-In Component (`/sign-in`). 

The page successfully rendered the Clerk Sign-In UI with the "Continue with Google" button and email input field. No Google OAuth error page was encountered during this initial redirect.

## 6. Protected Route Comparison

| Route | Expected | Actual | Classification |
|---|---|---|---|
| `/dashboard` | Redirect to `/sign-in` | `307` to `/sign-in?redirect_url=...` | PASS |
| `/customers` | Redirect to `/sign-in` | `307` to `/sign-in?redirect_url=...` | PASS |
| `/contacts` | Redirect to `/sign-in` | `307` to `/sign-in?redirect_url=...` | PASS |
| `/deals` | Redirect to `/sign-in` | `307` to `/sign-in?redirect_url=...` | PASS |
| `/tickets` | Redirect to `/sign-in` | `307` to `/sign-in?redirect_url=...` | PASS |
| `/notifications`| Redirect to `/sign-in` | `307` to `/sign-in?redirect_url=...` | PASS |

## 7. Root Cause Classification

### Test Account
**Classification**: `EXPECTED ENVIRONMENT GAP`
The E2E test account was provisioned exclusively for the Preview Clerk instance and is intentionally excluded from the Production environment by design.

### Notifications
**Classification**: `NO BUG — TEST ARTIFACT` / `CLERK/OAUTH CONFIGURATION ISSUE`
The `/notifications` route behaves identically to all other protected routes, correctly redirecting to `/sign-in`. The previously observed Google OAuth error (`Missing required parameter: client_id`) is likely a test artifact caused by the headless browser subsequently clicking "Continue with Google" on the sign-in page, which failed because the Production Clerk instance lacks Google OAuth credentials.

## 8. Security Assessment

Authentication and authorization remain fully intact and secure. No routes were exposed, and no bypasses were implemented. The middleware successfully protected all restricted paths.

## 9. Required Next Actions

- **code action**: NONE
- **Clerk/admin action**: Configure Google OAuth credentials (Client ID and Secret) in the Production Clerk Dashboard to resolve the OAuth error if Google sign-in is required.
- **test credential action**: Provision a valid production test user in the Production Clerk Dashboard (or utilize a known existing admin account) to proceed with Core CRM module verification.
- **no action**: No changes to the application route structure or middleware are necessary.

## 10. Production Changes

`NONE`
