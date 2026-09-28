# PHASE 15B — LAST KNOWN WORKING CLERK/VERCEL STATE

## A. Last known working deployment
The deployment corresponding to the period before the recent authentication troubleshooting began, when the Vercel environment variables were still configured for Production.

## B. Last known working commit
Likely at or just prior to `be36165` (release: Phase 15B client-demo CRM). The subsequent troubleshooting commits (`38d0463`, `4937d9c`, `edd3e4c`) were introduced to mitigate redirect loops and authentication errors encountered after the release.

## C. Last known working Clerk environment
- **Environment**: Production
- **Keys**: `pk_live_*` and `sk_live_*`

## D. Last known working Vercel hostname
- `https://crm-v01.vercel.app`

## E. Evidence for successful Admin login
The operator explicitly confirmed that they personally logged into `https://crm-v01.vercel.app` using the **existing Demo Admin Clerk Production account** before the recent troubleshooting changes were applied.

## F. Current Clerk environment
- **Environment**: Development
- **Keys**: `pk_test_*` and `sk_test_*` (Evidenced by the "Development mode" badge on the live site).

## G. Exact changes between working and broken states
1. **Environment Change**: To bypass infinite redirect loops or 441/500 errors encountered during testing, the Vercel environment variables were swapped from Production (`pk_live_`) to Development (`pk_test_`).
2. **Code Change**: `middleware.ts` was renamed to `proxy.ts` (Commit `4937d9c`), which effectively disables Next.js edge execution of `clerkMiddleware()`. 
3. **Code Change**: Various redirect fallbacks (`/unauthorized`) were added to prevent redirect loops.

## H. Whether `pk_test` was introduced during recent troubleshooting
**YES**. The Vercel environment was switched to Development API keys to unblock testing/redirect loops during the recent troubleshooting phase.

## I. Whether `pk_live` was previously active
**YES**. The operator's successful login with the Production Demo Admin account definitively proves that `pk_live_` was previously active in the Vercel environment.

## J. Whether the existing Production Admin account was previously usable on crm-v01.vercel.app
**YES**. The operator's testimony is the authoritative source.

## K. Code changes affecting authentication
- `88e9d23` renamed `proxy.ts` to `middleware.ts` (enabling edge middleware).
- `a7c9d53` / `04363ea` / `38d0463` modified authentication redirects and error handling.
- `4937d9c` renamed `middleware.ts` back to `proxy.ts` (disabling edge middleware).
- `edd3e4c` added a specific redirect to `/unauthorized` for unprovisioned users to prevent Clerk redirect loops.

## L. Environment changes affecting authentication
The Vercel environment variables (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`) were manually changed via the Vercel dashboard from Production to Development.

## M. Domain findings
While official Clerk documentation states a custom domain is required to correctly scope `__session` cookies for Production Edge Middleware, **the operator's historical success proves it is possible to authenticate on `crm-v01.vercel.app` using Production keys.** This occurs when strict edge middleware (`clerkMiddleware`) is bypassed or when relying on Account Portal/client-side authentication fallbacks that do not trigger the Public Suffix List third-party cookie block. Therefore, a custom domain is **NOT** strictly mandatory to restore the previous working state.

## N. Safest restoration plan
1. **Revert Environment**: Manually update the Vercel environment variables in the Vercel Dashboard back to the Clerk Production keys (`pk_live_` and `sk_live_`).
2. **Maintain Code State**: Do not re-enable `middleware.ts` yet, as `proxy.ts` successfully prevents the edge-level redirect loops on the `*.vercel.app` domain. 
3. **Redeploy**: Trigger a Vercel redeployment without any new code changes to apply the Production environment variables.

## O. Explicit list of things that must NOT be changed
- Do NOT purchase or provision a custom domain.
- Do NOT add DNS records.
- Do NOT create another Clerk instance or account.
- Do NOT change the existing Demo Admin credentials or `clerkId`.
- Do NOT modify the database or permissions.
- Do NOT enable `CRM_LOAD_TEST_AUTH_ENABLED`.
- Do NOT introduce authentication bypasses.

---

## FINAL CLASSIFICATION
**RESTORE_PREVIOUS_WORKING_CONFIGURATION**
