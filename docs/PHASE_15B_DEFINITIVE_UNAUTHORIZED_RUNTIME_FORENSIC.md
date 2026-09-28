# PHASE 15B — DEFINITIVE /UNAUTHORIZED RUNTIME FORENSIC

## A. Current browser behavior
**OBSERVED**: The authenticated Production Demo Admin reaches `https://crm-v01.vercel.app/unauthorized` with an "Account Not Provisioned" (or similar) UI state.

## B. Current Clerk authentication state
**PASS**: The Clerk authentication middleware successfully permits the request through to the CRM App Router. If the user were not authenticated with Clerk, `middleware.ts` would have issued a redirect to `/sign-in`.

## C. Current Clerk userId evidence
**UNABLE TO OBSERVE**: There is no direct, safe runtime evidence available in this isolated environment (Vercel CLI/logs are not directly accessible/authenticated here) to prove what `clerkAuth.userId` currently evaluates to during the live request.

## D. CRM User evidence
**CODE VERIFIED ONLY**: Based on the operator's read-only production SQL query, the database explicitly contains:
- ID: `dcc1344c-4398-4611-b5fd-6775c0f9adea`
- Email: `vasudevrathore126@gmail.com`
- Clerk ID: `user_3IrC39Gg8SQdOEOGwe7APuBlEnR`
- Status: `ACTIVE`
- Role: `TENANT_ADMIN`

## E. Clerk ID comparison
**UNVALIDATED**: Because the runtime Clerk `userId` cannot be observed (see C), it cannot be definitively compared against the expected `user_3IrC39Gg8SQdOEOGwe7APuBlEnR`.

## F. Database connection identity
**UNVALIDATED**: There is no safe, read-only mechanism in this environment to confirm that the Vercel Production deployment (`crm-v01.vercel.app`) is actually connected to the exact same Supabase production database that the operator just queried. If Vercel is pointing to a different environment (or if `DATABASE_URL` is misconfigured), the application will fail to find the User.

## G. getCurrentUser() result
**UNVALIDATED**: Code trace shows it executes `tx.user.findFirst({ where: { clerkId } })`. This will return `null` if the DB connection is wrong, or if `clerkId` does not match.

## H. synchronizeClerkIdentity() result
**UNVALIDATED**: If reached (due to `getCurrentUser()` failing the direct ID lookup), it will execute `tx.user.findFirst({ where: { email } })`. This will also return `null` and log "Identity Reassignment Denied" if the DB `clerkId` differs, or it will throw/return `null` if the DB connection fails.

## I. requireAuth() result
**THROWS**: The function explicitly throws `new Error('Unauthorized')` if the user is `null` or if `status === 'INACTIVE'`. 

## J. tenant resolution result
**NOT APPLICABLE (PASS)**: `layout.tsx` does not call `requireTenant()`. It only does safe extraction: `const tenantName = user?.tenant?.name || "Organization";`. Tenant context is not causing the `/unauthorized` rejection here.

## K. role resolution result
**NOT APPLICABLE (PASS)**: `layout.tsx` performs safe extraction: `const userRole = user?.userRoles?.[0]?.role?.name || "User";`. Role resolution is not causing the rejection.

## L. exact /unauthorized redirect source
**CODE VERIFIED ONLY**: The exact source is `src/app/(crm)/layout.tsx` lines 11-20:
```tsx
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/unauthorized');
  }
```

## M. exact underlying error if identifiable
**UNVALIDATED (SWALLOWED)**: The `catch` block in `layout.tsx` is completely broad and swallows **all** exceptions. The underlying error could be:
1. `Error('Unauthorized')` from `requireAuth()` (due to missing user or mismatch).
2. A Prisma/Database connection error (e.g., timeout, invalid credentials, IP restriction).
Both will silently result in a redirect to `/unauthorized`.

## N. Vercel log evidence
**UNABLE TO OBSERVE**: Vercel logs cannot be retrieved directly from this environment due to missing CLI authentication.

## O. Root cause classification
**CASE F: Current Clerk userId cannot be directly observed.**
We lack the runtime observability (Vercel logs) to definitively distinguish between:
- **CASE B**: Application is connected to the wrong database (Prisma throws or returns null).
- **CASE D**: Database connection/Prisma exception is being swallowed by the `catch` in `layout.tsx`.
- **CASE E**: Current authenticated Clerk `userId` does NOT match `user_3IrC39Gg8SQdOEOGwe7APuBlEnR` (resulting in Identity Reassignment Denied).

## P. Whether database mutation is required
**DEFERRED**: Do not mutate the database until the exact runtime error or Clerk ID is observed from logs.

## Q. Whether code change is required
**DEFERRED**: No code changes should be made right now. However, for future observability, the `catch` block in `layout.tsx` should log the swallowed error.

## R. Safest next action
The operator must review the **Vercel Production Runtime Logs** (via Vercel Dashboard) for the exact request that resulted in the `/unauthorized` redirect. 
Specifically, the operator must look for:
1. Any `PrismaClientInitializationError`, `PrismaClientKnownRequestError`, or connection timeouts (proving **CASE B/D**).
2. The `[Provisioning] Identity Reassignment Denied` warning log from `synchronizeClerkIdentity` (proving **CASE E**). 
3. Verification of the `DATABASE_URL` environment variable in Vercel Production.
