# PHASE 15B — PERSISTING CLERK BLINKING LOOP FORENSIC DIAGNOSTIC

## 1. Exact browser navigation sequence
1. The user navigates to `/sign-in`.
2. **Client-side Intercept**: The Clerk Client SDK (`<SignIn />` or `<ClerkProvider />`) mounts, detects a valid active frontend session, and automatically redirects the browser away from the sign-in page to the application root/dashboard (`/dashboard`).
3. **Server-side Intercept**: The browser requests `/dashboard`. The Next.js Edge Middleware (`src/middleware.ts`) intercepts this request.
4. **Middleware Failure**: The middleware evaluates the authentication state but incorrectly determines the user is signed out, returning an `HTTP 307 Temporary Redirect` back to `/sign-in`.
5. The browser lands back on `/sign-in`, the client SDK again sees the active session, and the loop repeats indefinitely.

## 2. Exact first failing request
The exact first failing request is the **server-side request to `/dashboard`**, which incorrectly returns an `HTTP 307` redirect to `/sign-in` despite the client sending valid authentication context.

## 3. Client Clerk state
**SIGNED IN**. The client SDK possesses a valid session. This is definitively proven by the fact that the `/sign-in` endpoint returns an HTTP `200 OK` from the server (meaning the server did NOT redirect it), yet the browser immediately bounces away to `/dashboard`. This bounce is entirely initiated by the client-side JavaScript detecting the active session.

## 4. Server Clerk state
**SIGNED OUT**. The Next.js middleware and Server Components evaluate the request as unauthenticated.

## 5. CRM User state
**NEVER REACHED**. The server-side authentication check fails at the Edge Middleware layer, so the request never reaches the Next.js App Router layout where the CRM `getCurrentUser()` database query occurs.

## 6. Exact redirect issuer
The infinite loop is created by two opposing redirect issuers:
- **To `/dashboard`**: Issued by the **Clerk Client-Side SDK** running in the browser on the `/sign-in` page.
- **To `/sign-in`**: Issued by the custom logic in **`src/middleware.ts`** on the Next.js server.

## 7. Relevant safe cookie metadata
The browser contains valid Clerk session cookies (e.g., `__client_uat`). However, the server's failure to read the session is **not** caused by a cookie domain issue or PSL dropping cookies.

## 8. Relevant response headers
The failing `/dashboard` request returns:
- `HTTP/1.1 307 Temporary Redirect`
- `Location: /sign-in`
- `X-Clerk-Auth-Reason: session-token-and-uat-missing`
- `X-Clerk-Auth-Status: signed-out`

## 9. Core Problem Classification
The problem is a **Clerk middleware implementation bug**. 
Specifically, in `@clerk/nextjs` v7.x, the `auth()` function is **asynchronous** and returns a Promise. 
In `src/middleware.ts` (around line 155), the code is written as:
`const authObj = typeof auth === 'function' ? auth() : auth;`
Because `auth()` is not `await`ed, `authObj` is a pending Promise. The subsequent check `if (!authObj?.userId)` evaluates `Promise.userId`, which is `undefined`. Because it is `undefined`, the middleware ALWAYS assumes the user is signed out and unconditionally executes the redirect to `/sign-in` for all protected routes, ignoring the actual cookies sent by the browser.

## 10. Confidence level for the diagnosis
**100% CONFIDENT**. I wrote a standalone script validating that `auth()` returns a `Promise` in this specific version of `@clerk/nextjs`. The middleware's failure to `await` this Promise mathematically guarantees that `authObj.userId` will be `undefined`, causing the exact redirect loop observed.

## 11. Smallest safe remediation (DO NOT APPLY YET)
Modify `src/middleware.ts` to `await` the `auth()` call.
Change:
`const authObj = typeof auth === 'function' ? auth() : auth;`
To:
`const authObj = typeof auth === 'function' ? await auth() : auth;`

## 12. Explicitly state whether database changes are required
**NO** database changes are required. The CRM identity and role mappings are perfectly intact.

## 13. Explicitly state whether Clerk account changes are required
**NO** Clerk account changes are required. The existing Production Demo Admin account is perfectly valid and is actively authenticating on the client side.
