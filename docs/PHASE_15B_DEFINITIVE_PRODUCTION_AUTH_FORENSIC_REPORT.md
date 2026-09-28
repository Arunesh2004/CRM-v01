# Phase 15B — Definitive Production Auth Forensic Report

## 1. Executive Finding
**ROOT CAUSE NOT YET PROVEN.**
The application reaches `/unauthorized` because `CRMLayout` catches an exception thrown by `requireAuth()`. However, the exact reason `requireAuth()` throws (and why an unhandled `Error: Unauthorized` appears in Vercel logs) cannot be definitively proven without runtime Vercel logs or database connection validation.

## 2. Deployment Identity
- **Git commit**: Local environment state.
- **Vercel deployment**: UNVALIDATED (Cannot read `crm-v01` environment directly).
- **Production alias**: `crm-v01.vercel.app`.
- **Deployment status**: UNVALIDATED.

## 3. Clerk Authentication
- **Middleware execution**: PASS. `middleware.ts` runs and does not issue a 307 redirect to `/sign-in` (which it would if `authObj.userId` were missing).
- **Server-side auth result**: UNVALIDATED. The Server Component `auth()` may be failing to read the session state passed by middleware.
- **Runtime Clerk userId**: UNABLE TO OBSERVE.
- **Production/Development classification**: Production.

## 4. CRM Identity
**CODE VERIFIED ONLY** (from operator's SQL query):
- **User ID**: `dcc1344c-4398-4611-b5fd-6775c0f9adea`
- **Email**: `vasudevrathore126@gmail.com`
- **Clerk ID**: `user_3IrC39Gg8SQdOEOGwe7APuBlEnR`
- **Status**: `ACTIVE`
- **Tenant ID**: `6314f0ec-c3a2-4288-b89f-ed981fd7f712`
- **Role**: `TENANT_ADMIN`

## 5. Clerk ↔ CRM Identity Comparison
**UNVALIDATED**. The runtime `clerkAuth.userId` cannot be observed to compare against `user_3IrC39Gg8SQdOEOGwe7APuBlEnR`.

## 6. Database Connection Identity
**UNVALIDATED**. We cannot safely verify if Vercel Production is connected to the exact Supabase instance queried, as we cannot access `DATABASE_URL` via Vercel CLI from this environment.

## 7. getCurrentUser() Trace
- `auth().userId` is retrieved. If `null`, it returns `null` silently.
- It attempts `tx.user.findFirst({ where: { clerkId } })`.
- If `null` (or DB connection fails), it falls back to `ensureUserProvisionedFromClerk(clerkId)`.
- **Result**: UNVALIDATED (We lack logs to prove which branch executed).

## 8. synchronizeClerkIdentity() Trace
- Attempts `tx.user.findFirst({ where: { email } })`.
- If `clerkId` does not match, logs `[Provisioning] Identity Reassignment Denied` and returns `null`.
- **Result**: UNVALIDATED. The Vercel logs snippet provided lacks `[Provisioning]` logs, suggesting it may not have been reached (e.g., if `userId` was `null` initially).

## 9. requireAuth() Trace
- Calls `getCurrentUser()`.
- If `user` is `null` or `status === 'INACTIVE'`, explicitly throws `new Error('Unauthorized')`.
- **Result**: THROWS.

## 10. Exact Unauthorized Throw Site
The exact source-level origin of the minified stack trace is `src/lib/auth.ts` inside `requireAuth()`:
```typescript
if (!user) {
  throw new Error('Unauthorized');
}
```

## 11. Layout Redirect
In `src/app/(crm)/layout.tsx`:
```tsx
try {
  user = await requireAuth();
} catch {
  redirect('/unauthorized');
}
```
The `catch` block natively swallows **any** exception thrown by `requireAuth()` (including Prisma connection errors) and executes a Next.js `redirect()` to `/unauthorized`. This explains why the user visually lands on `/unauthorized`. (Note: The unhandled `Error: Unauthorized` logged in Vercel likely originates from a concurrent client-side fetch to an API route or a parallel un-caught component, as `CRMLayout`'s try-catch suppresses the layout's error).

## 12. RLS / Tenant / Role Findings
- **RLS**: UNVALIDATED. If RLS is misconfigured, `getCurrentUser()` will return `null`.
- **Tenant**: PASS. `requireTenant()` is not called before the failure.
- **Role**: PASS. Role resolution does not cause the throw.

## 13. Vercel Log Evidence
- `[error] Error: Unauthorized` proves `requireAuth()` threw, indicating `user` resolved to `null`.
- The absence of `[Provisioning] Identity Reassignment Denied` strongly suggests that identity synchronization was NEVER attempted (likely because `auth().userId` was `null` in the Server Component).

## 14. Root Cause Classification
**ROOT CAUSE NOT YET PROVEN.**
Possibilities remaining:
- **WRONG DATABASE**: The DB connection is pointing elsewhere.
- **CLERK SERVER AUTH FAILURE**: The Clerk Server Component `auth()` fails to read the session state (despite middleware working), causing `userId` to be `null`.
- **APPLICATION EXCEPTION SWALLOWED**: Prisma fails, and `CRMLayout` swallows it.

## 15. Security Assessment
- Load-test bypass disabled: VERIFIED.
- No credentials exposed: VERIFIED.
- No auth weakening: VERIFIED.
- No DB mutation: VERIFIED.
- No Clerk mutation: VERIFIED.

## 16. Recommended Minimal Fix
DEFERRED. No fix can be safely recommended until Vercel runtime configuration or full request logs are verified.

## 17. Validation Plan
Once the root cause is established and fixed, validate by successfully loading `/dashboard` with the Demo Admin account without triggering the `catch` block in `CRMLayout`.
