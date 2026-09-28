# PHASE 15B — PRODUCTION DEMO ADMIN IDENTITY MAPPING FORENSIC

## A. Current hosted behavior
The Next.js Edge Middleware successfully validates the Clerk Production session (thanks to the `await` fix) and allows the request to reach the CRM App Router. However, the application rejects the user's CRM identity and issues a redirect to `/unauthorized`.

## B. Clerk authentication result
**PASS**. The user successfully authenticated with Clerk Production. Clerk issued a valid session token containing the Clerk `userId` and `email`.

## C. Exact middleware result
**PASS**. `src/middleware.ts` executes `const authObj = typeof auth === 'function' ? await auth() : auth;`. Because `authObj.userId` is now successfully resolved from the valid session, the middleware allows the request to proceed to the Server Components.

## D. Exact auth.ts path
1. The request reaches `src/app/(crm)/layout.tsx`, which calls `await requireAuth()`.
2. `requireAuth()` calls `getCurrentUser()`.
3. `getCurrentUser()` extracts `clerkId = clerkAuth.userId`.
4. It performs a database lookup: `tx.user.findFirst({ where: { clerkId } })`. 
5. The direct `clerkId` lookup fails (returns null).
6. It falls back to `ensureUserProvisionedFromClerk(clerkId)`, which fetches the Clerk email and calls `synchronizeClerkIdentity(clerkId, email)`.
7. `synchronizeClerkIdentity` returns `null` (denying the login).
8. `requireAuth()` receives `null` and executes: `throw new Error('Unauthorized');`.

## E. Exact CRM User lookup
The lookup in `synchronizeClerkIdentity` (`src/modules/auth/services/provisioning.service.ts`) uses **ONLY the exact normalized email**:
```typescript
const email = emailStr.toLowerCase().trim();
const user = await tx.user.findFirst({ where: { email: email } });
```

## F. Production User row metadata
**BLOCKED**. Local Prisma execution against the production database fails because the Supabase pooler actively rejects connections from this runner environment. 

## G. Current Clerk user ID vs CRM clerkId comparison
**UNVALIDATED (Likely CASE 2: MISMATCH)**. Because the Vercel application logs for this specific request were not provided, I cannot observe the exact `clerkId`. However, based on the code trace, the database `user.clerkId` no longer matches the current Clerk Production `userId`.

## H. User status
**CODE VERIFIED ONLY**. Previously reported as `ACTIVE`. If it is still `ACTIVE`, the failure is exclusively an identity mismatch.

## I. Tenant mapping
**CODE VERIFIED ONLY**. Previously reported as Canonical Demo Company.

## J. TENANT_ADMIN role verification
**CODE VERIFIED ONLY**. The previous 29-row SQL evidence confirms the `TENANT_ADMIN` role is fully intact. The issue is identity resolution, not RBAC authorization.

## K. synchronizeClerkIdentity behavior
```typescript
  if (user.status === 'ACTIVE') {
     if (user.clerkId === clerkId) {
        return user;
     } else if (user.clerkId === null) {
        // ... binds new identity ...
     } else {
        Logger.warn(`[Provisioning] Identity Reassignment Denied`, { expected: user.clerkId, got: clerkId });
        return null;
     }
  }
```
**Behavior**: 
- It requires **exact** `clerkId` equality.
- It fiercely **rejects identity reassignment** if the database `clerkId` is already populated but does not match the incoming Clerk `userId`.
- It treats `INVITED` differently (denies them entirely, forcing the token flow).
- It safely returns `null` upon denial.

## L. Exact reason /unauthorized is reached
In `src/app/(crm)/layout.tsx`:
```tsx
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/unauthorized');
  }
```
Because `synchronizeClerkIdentity` denies the login (returning `null`), `requireAuth()` throws an Error, which is caught by the layout component, triggering the client redirect.

## M. Root cause classification
**CASE 2: Clerk authenticated + CRM User exists + clerkId does NOT match → identity mapping mismatch.**
The most probable historical explanation is that during earlier troubleshooting, the Demo Admin Clerk account was deleted and recreated in the Clerk Production dashboard. This generated a completely new Clerk `userId` for `vasudevrathore126@gmail.com`. The CRM database is still holding the *old* `clerkId`, triggering the `Identity Reassignment Denied` security guard.

## N. Whether database mutation is required
**YES**. An identity-mapping mutation is required to update `User.clerkId` to match the new Clerk Production ID.

## O. Whether code change is required
**NO**. The `Identity Reassignment Denied` security guard is working exactly as designed to prevent account takeovers. Do not weaken it.

## P. Safest next action
The operator must execute a manual SQL `UPDATE` in the Supabase SQL Editor to nullify or replace the stale `clerkId`.

**Recommended SQL:**
```sql
UPDATE "User"
SET "clerkId" = NULL
WHERE email = 'vasudevrathore126@gmail.com';
```
*(By setting it to `NULL`, `synchronizeClerkIdentity` will safely auto-bind the new Clerk ID on the next login attempt).*
