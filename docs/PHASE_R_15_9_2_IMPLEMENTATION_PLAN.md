# Phase R.15.9.2 — Production Auth & Database Schema Repair Plan

## Goal
Fix the two proven production blockers:
1. The missing `User.deletedAt` column in the Supabase production database, which will cause `P2022` Prisma errors on all User lookups.
2. The Clerk environment mismatch on Vercel that forces the Server Component `auth()` to return `userId: null`, breaking tenant provisioning.

## Proposed Changes
### 1. Database Schema Repair (Automated)
- Verify `User.deletedAt` is missing by checking Prisma connection against Supabase.
- Run `npx prisma migrate dev --name add_user_deleted_at --create-only --schema database/schema.prisma` to generate the SQL diff.
- Verify the generated `.sql` file only contains: `ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);`
- Run `npx prisma migrate deploy --schema database/schema.prisma` targeting the production Supabase database via the direct connection string (`port 5432`).
- Verify via a read-only script that `User.deletedAt` is now present.

### 2. Vercel Clerk Environment Synchronization (Manual)
Since I do not have direct access to your Vercel Dashboard, I need you to manually verify the Clerk environment variables on Vercel.

**Required Action:**
1. Open your Vercel Dashboard for `crm-v01`.
2. Go to **Settings > Environment Variables**.
3. Ensure the following pairs match EXACTLY with your local `.env` or your intended live environment:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. If they are mismatched (e.g. one is `test` and the other is `live`), update them to match.
5. Save and trigger a new deployment (or just let my upcoming code push trigger it).

## Verification Plan
1. `npm run build` locally to verify the schema matches the generated client.
2. Push the newly generated migration to `origin/main` to sync the repository.
3. Once Vercel deploys, you will perform a live authentication test on `/dashboard` and report back.

> [!IMPORTANT]
> **User Review Required**: Please approve this plan so I can generate and deploy the `deletedAt` Prisma migration to your Supabase instance. Simultaneously, please manually verify the Vercel Clerk environment variables as detailed in Step 2.
