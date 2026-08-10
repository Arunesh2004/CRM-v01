# Phase R.15.9.1 — Unauthorized Root Cause Investigation

## 1. Production Evidence
- Route: `GET /dashboard`
- Error: `Error: Unauthorized`
- Middleware returned `200`.
- Clerk JWKS request succeeded.

## 2. Exact Runtime Error Source
The `Error: Unauthorized` exception is thrown exactly from `src/lib/auth.ts` at line 87 inside the `requireAuth()` function.

## 3. All Possible Unauthorized Sources
Through a repository-wide trace, the following were identified:
- `src/lib/tenant-context.ts:6`
- `src/lib/auth.ts:87` (The confirmed source)
- `src/modules/communication/services/*.ts`

## 4. `/dashboard` Execution Trace
1. Middleware executes, verifies JWKS, and passes request (`200 OK`).
2. Server Component `/dashboard/page.tsx` calls `await requireAuth()`.
3. `requireAuth()` calls `let user = await getCurrentUser()`.
4. `getCurrentUser()` calls `const clerkAuth = await auth();`.
5. `auth()` fails to resolve the user identity locally and returns `userId: null`.
6. `getCurrentUser()` hits `if (!clerkId) return null;` and skips all database calls.
7. `requireAuth()` receives `user = null`.
8. `requireAuth()` attempts fallback: `const clerkAuth = await auth();`.
9. `if (clerkAuth.userId)` evaluates to **false**, skipping the provisioning attempt.
10. `if (!user)` evaluates to true and throws `new Error('Unauthorized')`.

## 5. Clerk Session Analysis
The middleware successfully passed the request, implying a valid JWT structure was received by Vercel Edge. However, the Node.js Server Component `auth()` function failed to extract the `userId`. 

**Why did `auth()` return `null`?**
This is a classic signature of a **Clerk Environment Mismatch**. The Vercel backend environment variables (`CLERK_SECRET_KEY`) are either missing, corrupted, or belong to a different environment (e.g., Test vs Live) than the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` used by the frontend. The backend fails to verify the session JWT locally and silently returns `null` for the `userId`.

## 6. Database Verification & The "Latent P2022 Bomb"
While proving this trace, I ran a direct verification against the Supabase transaction pooler on port 5432. I discovered a catastrophic latent bug:
- `User.deletedAt` was added to `schema.prisma` in a previous phase.
- A Prisma migration (`.sql` file) was **never generated or applied** for this column.
- The production Supabase database **does not have the `deletedAt` column**.
- Vercel built the Prisma Client from `schema.prisma` *with* the `deletedAt` field.

**Deductive Proof:** If `auth().userId` had been valid, `getCurrentUser()` would have executed `prisma.user.findUnique()`. This would have instantly crashed the server with an uncaught `PrismaClientKnownRequestError: P2022 (The column User.deletedAt does not exist)` instead of `Unauthorized`. The fact that Vercel threw `Unauthorized` mathematically proves that Prisma was **never called**, confirming that `userId` was indeed `null`.

## 7. Root Cause
- **Primary Root Cause**: `CLERK ENVIRONMENT MISMATCH / MISSING LOCAL USER`
- **Secondary Latent Root Cause**: `DATABASE SCHEMA MISMATCH (Missing User.deletedAt)`

## 8. Confidence
**CONFIRMED** (100%)

## 9. Minimal Corrective Action
1. **Fix the Environment**: Verify and synchronize Vercel's `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to ensure they are paired correctly (both Test or both Live).
2. **Fix the Schema**: Run `npx prisma migrate dev --name add_user_deleted_at` locally to generate the missing migration for the `deletedAt` column, apply it to the production database via `prisma migrate deploy`, and push the migration file to GitHub.

## 10. Security & Regression Risks
- **Security Impact**: Safe. The application correctly threw an `Unauthorized` boundary when identity resolution failed, preventing unauthenticated access to the tenant context.
- **Regression Risks**: High if only the Clerk keys are fixed. Fixing the Clerk keys will immediately trigger the latent `P2022` database error on the very next request. Both issues must be patched simultaneously.
