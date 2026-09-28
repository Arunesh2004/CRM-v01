# PHASE 15B — PRODUCTION CLERK BLINKING LOOP FORENSIC REPORT

## A. Exact Reproduction & Navigation Sequence
The observed behavior is an infinite redirect loop between the Clerk client-side SDK and the Next.js Server Components.
1. User successfully logs in at `/sign-in`.
2. Clerk Client SDK establishes a frontend session and navigates the browser to the application root (`/dashboard` or `/`).
3. Next.js Server receives the request but perceives the user as **unauthenticated**.
4. The Server (or Server Component) issues an HTTP 307 redirect back to `/sign-in`.
5. The browser lands on `/sign-in`, where the Clerk Client SDK immediately detects the active frontend session and automatically redirects back to `/dashboard`.
6. The cycle repeats indefinitely, appearing as a "blinking" white/dark screen.

## B. HTTP Status Sequence
- `GET /dashboard` -> `HTTP 307 Temporary Redirect` (Location: `/sign-in`)
- `GET /sign-in` -> Client-side Next.js/Clerk intercepts and navigates back to `/dashboard`.

## C. Browser Console Errors & Network Failures
*Diagnosed via server response analysis rather than browser runner.*
The critical failure is not a JavaScript exception but a continuous HTTP 307 state loop.

## D. Clerk Client vs Server State Mismatch
**CLIENT STATE:** The client is successfully **SIGNED IN**. The Clerk frontend SDK holds a valid token/session in local storage or first-party cookies for the specific origin.
**SERVER STATE:** The Next.js server perceives the user as **SIGNED OUT**. This is evidenced by the server responding with `X-Clerk-Auth-Reason: session-token-and-uat-missing` and `X-Clerk-Auth-Status: signed-out` headers.

## E. CRM Authentication State & User Lookup
Because the Clerk `auth()` call on the server returns `userId: null`, the CRM `getCurrentUser()` lookup immediately returns `null` without even querying the database. The database lookup does not fail; it is never reached.

## F. Redirect Source
The server-side redirect to `/sign-in` is triggered because the server perceives an unauthenticated request to a protected route. Although `layout.tsx` attempts to catch authorization errors and redirect to `/unauthorized`, the Clerk `auth()` infrastructure natively intercepts the unauthenticated state (or throws a redirect that overrides the catch block) and enforces a redirect to the configured `NEXT_PUBLIC_CLERK_SIGN_IN_URL`.

## G. Code-Path Analysis & Comparison with Last-Known-Working State
In commit `4937d9c`, the `middleware.ts` file was renamed to `proxy.ts`. 
In Next.js App Router, Edge Middleware **must** be named `middleware.js` or `middleware.ts`. 
Because it was renamed to `proxy.ts`, Vercel completely ignores it. The `.next/server/middleware-manifest.json` confirms `"middleware": {}` (empty).

**Impact:**
1. `clerkMiddleware()` is **not running**.
2. Without `clerkMiddleware()`, the `@clerk/nextjs/server` `auth()` function cannot reliably parse the authentication state (cookies/headers) injected by the Clerk frontend, especially under strict cross-site cookie conditions (like Vercel's `.vercel.app` Public Suffix List).
3. Every Server Component calling `auth()` falsely concludes the user is signed out.

## H. Most Strongly Evidenced Root Cause
The root cause is the **disabling of the Next.js Edge Middleware** by renaming `middleware.ts` to `proxy.ts`. Without `clerkMiddleware()` running at the edge, the server cannot synchronize its authentication state with the client-side Clerk SDK.

## I. Safest Next Action
Rename `src/proxy.ts` back to `src/middleware.ts` to restore the Next.js Edge Middleware and allow `clerkMiddleware()` to process the incoming session tokens correctly.

---

## FINAL CLASSIFICATION
**ROOT_CAUSE_IDENTIFIED — NO CHANGES MADE**
