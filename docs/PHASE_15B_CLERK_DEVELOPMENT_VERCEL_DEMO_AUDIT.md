# PHASE 15B — CLERK DEVELOPMENT ENVIRONMENT AUDIT FOR VERCEL DEMO

## 1. Executive Summary
The Vercel-hosted deployment at `https://crm-v01.vercel.app` is currently blocked by a Clerk Production cookie mismatch (the Public Suffix List prevents `Domain=vercel.app`). 
However, **Clerk DEVELOPMENT instances (`pk_test_`) do NOT enforce the strict custom-domain requirements** that Production instances do. 
The audit confirms that the existing Vercel deployment can seamlessly and safely operate using Clerk Development credentials without a single source-code or architectural change. The CRM's authentication, authorization, RBAC, and Tenant Isolation mechanisms are completely environment-agnostic.

**Status: DEVELOPMENT CLERK CAN SAFELY BE USED ON THE EXISTING VERCEL HOSTNAME.**

## 2. Current Vercel Deployment
- **Hostname**: `https://crm-v01.vercel.app`
- **Status**: Live, passing all API health checks, but failing the authenticated UI routing loop due to missing cookies.

## 3. Current Clerk Configuration
- **Instance Type**: Production (`pk_live_`)
- **Limitation**: Requires a first-party DNS record (custom domain). Does not function on `.vercel.app`.

## 4. Clerk Source-Code Architecture
- **Provider**: Standard `@clerk/nextjs` integration (`<ClerkProvider>`).
- **Middleware**: Uses `clerkMiddleware()` in `src/proxy.ts`.
- **Hardcoding**: The codebase relies entirely on `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. `pk_live_` is **not** hardcoded in any application logic.
- **Proxy**: The `/__clerk` proxy is dynamically enabled if `NEXT_PUBLIC_CLERK_PROXY_URL` is set in the environment.

## 5. Current Authentication Flow
- Identity (Clerk) → CRM User (DB via `clerkId`) → Tenant (DB) → Role (DB) → Permissions (DB).
- The flow relies entirely on the resolved `auth.userId` from Clerk Middleware.

## 6. Current Redirect-Loop Evidence
- As verified previously, the server rejects the session (no cookie), sending the client to `/sign-in`. The client detects local state and sends the user back to `/dashboard`, spinning indefinitely.

## 7. Development vs Production Environment Analysis
| Feature | Clerk Production | Clerk Development |
|---------|------------------|-------------------|
| Custom Domain Required | **Yes** | **No** (Supports `*.vercel.app` natively) |
| Allowed Origins check | Strict (DNS verified) | Flexible (Dashboard configured) |
| Cookie Strategy | First-party (`Domain=yourdomain.com`) | Third-party / Sync / Account portal |
| Architecture Impact | None | None |

## 8. Vercel Environment-Variable Audit
Currently Vercel Production contains:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_live_...`
- `CLERK_SECRET_KEY`: `sk_live_...` (inferred)
- `NEXT_PUBLIC_CLERK_PROXY_URL`: `/__clerk`

## 9. /__clerk Proxy Analysis
The `/__clerk` proxy route handler (`src/app/__clerk/[[...path]]/route.ts`) is environment-agnostic. It works identically with Development keys, acting as a transparent tunnel to the Clerk backend. We can either keep it or simply remove `NEXT_PUBLIC_CLERK_PROXY_URL` from the Vercel variables to rely on Clerk Dev's standard account portal.

## 10. Sign-in/Sign-up Analysis
URLs are standard (`/sign-in`, `/sign-up`). These are 100% compatible with Development Clerk.

## 11. Security Impact
**Zero weakening of security.** 
- The `clerkMiddleware` remains fully active.
- Rate limits remain fully active.
- The load-test bypass remains **disabled**.
- CSP and Security Headers remain active.

## 12. Tenant/RBAC Impact
**None.** 
The CRM enforces Tenant and RBAC rules based on the `userId` (`clerkId`) attached to the DB User. A Development `userId` looks structurally identical to a Production `userId` (`user_2...`). The CRM does not care which environment generated the token, as long as `clerkMiddleware` validates the cryptographic signature.

## 13. Database Impact
Because the Demo will use a different Clerk instance (Dev instead of Prod), the `clerkId` values for the Admin and Employee accounts will change. 
**Impact**: The operator must either invite a new Admin/Employee user through the UI, or manually update the `clerkId` column in the existing demo DB records to match the newly created Clerk Development user IDs.

## 14. Custom Domain Requirement
**Not required for the Demo.** 
Development Clerk natively supports `.vercel.app` hostnames.

## 15. Final Classification
**PASS — DEVELOPMENT CLERK CAN SAFELY BE USED**

---

# SECTION 2 — PROPOSED DEMO CONFIGURATION

## 16. Exact Operator Verification Required
The operator must verify that they have access to a Clerk Development instance (`pk_test_`, `sk_test_`). This can be a completely separate "Demo" application in the Clerk Dashboard to ensure total isolation from the client's actual Production instance.

## 17. Exact Changes Required (Vercel Configuration Only)
The following environment variables must be updated in Vercel for the Production deployment:

1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → Replace with `pk_test_...`
2. `CLERK_SECRET_KEY` → Replace with `sk_test_...`
3. (Optional but recommended for simplicity) Remove `NEXT_PUBLIC_CLERK_PROXY_URL` from Vercel so the Dev instance uses standard Clerk Account Portal syncing, eliminating proxy complexity.

**Database Changes:**
The operator must sign up on the newly configured Demo instance, capture their resulting `clerkId`, and inject it into the `User` table for the Admin account to re-link identity.

## 18. Things That MUST NOT Be Changed
- Do **not** modify `src/proxy.ts`.
- Do **not** modify `src/lib/auth/...`.
- Do **not** modify CSP or security headers.
- Do **not** enable `CRM_LOAD_TEST_AUTH_ENABLED`.
- Do **not** touch the client's actual Clerk Production instance.
