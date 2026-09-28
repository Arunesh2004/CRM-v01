# PHASE 15B — DEFINITIVE REDIRECT-LOOP FORENSIC ANALYSIS

## A. Exact request timeline (from live Vercel logs)
1. `18:28:21.15  /sign-in` (Client SDK detects active session, triggers client-side redirect to `/`)
2. `18:28:21.19  /` (Next.js server responds with redirect to `/dashboard`)
3. `18:28:21.35  /dashboard` (Next.js Edge Middleware intercepts, fails auth check, redirects to `/sign-in`)
4. `18:28:21.55  /sign-in` (Client SDK detects session again, loops back to `/`)
5. `18:28:21.62  /` (Loop continues indefinitely)

## B. Exact HTTP status/Location for each transition
- **`/sign-in`**: HTTP 200 OK. The Client-side JS `<SignIn />` component issues a client-side routing redirect to `/` because it detects the user is already authenticated.
- **`/`**: HTTP 307 Temporary Redirect. Location: `/dashboard` (Issued by `src/app/page.tsx`).
- **`/dashboard`**: HTTP 307 Temporary Redirect. Location: `/sign-in` (Issued by `src/middleware.ts`).

## C. Client Clerk state
**SIGNED IN**. The client successfully fetches `/__clerk/v1/environment` and `/__clerk/v1/client` (via the proxy), parses the active first-party `__session` cookie, and correctly identifies the user as authenticated. This is why it aggressively redirects away from the `/sign-in` page.

## D. Middleware Clerk state
**SIGNED OUT (Falsely)**. The Edge Middleware evaluates the request as unauthenticated because of an implementation bug in the custom handler, preempting any internal Clerk logic.

## E. Server auth() state (Server Components)
**NEVER REACHED**. The request to `/dashboard` is intercepted and redirected by the Edge Middleware before the App Router can execute the Server Components.

## F. CRM User state
**NEVER REACHED**. 

## G. Exact redirect issuer
1. `/sign-in` → `/` : **Clerk Client SDK** (Client-side)
2. `/` → `/dashboard` : **`src/app/page.tsx`** (Server-side)
3. `/dashboard` → `/sign-in` : **`src/middleware.ts` custom logic** (Server-side Edge)

## H. Exact root cause
The custom `middlewareHandler` in `src/middleware.ts` fails to `await` the `auth()` function. 
In `@clerk/nextjs` v7.x, the `auth()` function is asynchronous. 
```typescript
const authObj = typeof auth === 'function' ? auth() : auth;
if (!authObj?.userId) {
  return NextResponse.redirect(signInUrl);
}
```
Because `auth()` is not awaited, `authObj` is a pending Promise. The expression `!authObj?.userId` evaluates the `.userId` property on the Promise object, which is `undefined`. Because `undefined` is falsy, `!undefined` evaluates to `true`, causing the middleware to unconditionally issue a 307 redirect to `/sign-in` for all protected routes, regardless of the valid cookies the browser sent.

## I. Evidence supporting root cause
1. **Live Log Timings**: The sequence `/dashboard` → `/sign-in` → `/` perfectly maps to the three redirect issuers identified above.
2. **Historical Context**: The operator previously achieved a successful login when `middleware.ts` was named `proxy.ts`. Renaming it to `proxy.ts` disabled the Edge Middleware, thereby bypassing the unawaited Promise bug entirely. Server Components (`layout.tsx`) were then able to handle authentication correctly using `await getCurrentUser()`.
3. **Cookie Integrity**: The fact that the client redirects away from `/sign-in` proves the first-party `__session` cookie is present, valid, and successfully proxied via `/__clerk`.

## J. Alternative hypotheses ruled out
- **Public Suffix List / Custom Domain**: Ruled out. The `next.config.ts` rewrite to `/__clerk` proxy correctly establishes first-party cookies, allowing Vercel domains to work with Production keys.
- **`[MIDDLEWARE] LOAD_TEST_SECRET: undefined`**: Ruled out. This is a harmless `console.log` on line 32 of `src/middleware.ts` that executes unconditionally before returning `false`. It has no impact on the auth flow.
- **Middleware Filename**: The filename `proxy.ts` did not cause the loop; rather, it *disabled* the buggy middleware that was causing the loop. Re-enabling the middleware by renaming it back to `middleware.ts` restored the bug.

## K. Smallest safe fix (DO NOT APPLY YET)
Modify `src/middleware.ts` to `await` the `auth()` invocation:
```typescript
const authObj = typeof auth === 'function' ? await auth() : auth;
```

## L. Whether code change is required
**YES**. `src/middleware.ts` requires the `await` keyword.

## M. Whether Vercel env change is required
**NO**. The Production keys are correct.

## N. Whether Clerk Dashboard change is required
**NO**.

## O. Whether database change is required
**NO**.

---
**CONFIDENCE**: HIGH
**STOPPING**: No code changes have been applied.
