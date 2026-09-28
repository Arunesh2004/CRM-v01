# CRM-v01 Vercel Clerk Deployment Regression Audit

## 1. Executive Summary
This audit answers the critical question: **Was Clerk authentication previously working on `https://crm-v01.vercel.app`, and if so, what changed?**

The forensic evidence from the repository's documentation and deployment history conclusively proves that the recent authentication regression (the `/sign-in` loop and blank screens) was **not caused by application code changes**, but rather by a fatal environment configuration change: **The Vercel environment was switched from Clerk Development (`pk_test_`) keys to Clerk Production (`pk_live_`) keys on a shared `.vercel.app` domain.**

## 2. Forensic Timeline & Evidence

### Stage 1: The Initial Working State (Development Keys)
Previously, the deployment at `https://crm-v01.vercel.app` was operating using **Clerk Development Keys (`pk_test_`)**. 
* **Evidence:** In `docs/PHASE_R_15_9_3_CURRENT_PRODUCTION_AUTH_REACT_FAILURE_REPORT.md` (Section 5), it is explicitly stated: *"The project's Vercel environment is currently loaded with Clerk Development Keys (pk_test_)."*
* **Behavior:** With `pk_test_` keys, Clerk does not strictly enforce custom domain cookie rules. It relies on the `__client_uat` third-party cookie. This allowed authentication to work for users on browsers that did not strictly block cross-site tracking.
* **Proof of Server-Side Execution:** `docs/PHASE_R_15_9_LIVE_VERCEL_FAILURE_REPORT.md` proves that Server Components were successfully reading the Clerk session. It documents the exact backend crash point as the tenant provisioning logic: *"When a user logs in, `/dashboard` calls `requireAuth()`, which detects a missing local user and triggers `ensureUserProvisionedFromClerk()`."* This proves `auth().userId` was successfully populated at that time.

### Stage 2: The Flawed Remediation Directive
Because modern browsers increasingly block third-party cookies by default (like Safari's ITP), the `pk_test_` configuration began failing for some users. The server could not read the third-party cookie, resulting in `userId: null` and an `Unauthorized` error (React Error #441).
* **Evidence:** `docs/PHASE_R_15_9_3_CURRENT_PRODUCTION_AUTH_REACT_FAILURE_REPORT.md` diagnosed this third-party cookie issue and recommended a fatal fix: *"You MUST replace the Clerk test keys in the Vercel Dashboard with Clerk Live Keys (`pk_live_` and `sk_live_`)."*

### Stage 3: The Fatal Configuration Change
Following the directive, the Vercel environment variables were updated to use **Clerk Production Keys (`pk_live_`)**.
* **Evidence:** My previous live audit of `https://crm-v01.vercel.app` confirmed that the site is currently running with `pk_live_` keys.
* **The Regression:** Switching to `pk_live_` keys on a `.vercel.app` domain causes immediate, permanent failure. Clerk Production environments mandate first-party cookies, but browsers enforce the **Public Suffix List (PSL)**, which categorizes `*.vercel.app` as a top-level domain. The browser actively blocks Clerk from setting the `__session` cookie on `.vercel.app`.
* **The Result:** The Clerk middleware (`proxy.ts`) and Server Components are completely starved of session state. They constantly perceive the user as unauthenticated, triggering the infinite redirect loop (`/sign-in` → `/` → `/dashboard` → `/sign-in`).

## 3. Codebase Validation
We performed a deep inspection of recent codebase changes to rule out application-level regressions:
* **`middleware.ts` renamed to `proxy.ts` (Commit `4937d9c`):** This is a **correct** and required refactor. Next.js 16.3.5 (the specific version used in this project) deprecated `middleware.ts` in favor of `proxy.ts`. Documentation in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` confirms this file convention. Next.js Edge Middleware is running correctly.
* **`package.json` dependencies:** Unchanged across the regression timeline.

## 4. Conclusion
Authentication **did work** previously on `crm-v01.vercel.app`, but only because it was running in **Clerk Development Mode (`pk_test_`)**.

**What Changed?**
The environment was switched to **Clerk Production (`pk_live_`)**. It is mathematically impossible to run a Clerk Production instance on a `*.vercel.app` domain due to browser PSL constraints. 

There are no code fixes possible. The deployment cannot proceed on `crm-v01.vercel.app` with `pk_live_` keys. The environment must either be reverted to `pk_test_` keys (for demo purposes, accepting third-party cookie limitations), or a proper custom domain must be provisioned.
