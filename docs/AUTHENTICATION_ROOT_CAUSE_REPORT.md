# Authentication Root Cause Report

## Incident Summary
The authenticated user successfully logs in via Clerk but is rejected by the application with an `Unauthorized` error when attempting to access protected routes like the Dashboard.

## Investigation Steps

### 1. Is Clerk returning auth().userId?
**YES.** Clerk is successfully setting the session cookie and `auth().userId` is correctly populated on the server.

### 2. Does the User table contain this Clerk user?
**NO.** A direct query of the local PostgreSQL database using a script (`check-users.ts`) revealed that the only user in the database is the seeded demo user (`demo-clerk-admin`). The newly authenticated user does not exist in the database.

### 3. Is the clerkId stored correctly?
**NO.** Because the user does not exist in the database, there is no `clerkId` stored for them.

### 4. Is getCurrentUser() querying the correct field?
**YES.** `getCurrentUser()` correctly queries `prisma.user.findUnique({ where: { clerkId } })`. This query fails because the record does not exist.

### 5. Is requireTenant() failing because no tenant exists?
**NO.** The failure occurs earlier. `requireAuth()` calls `getCurrentUser()`, which returns `null`, causing `requireAuth()` to throw `Unauthorized` before `requireTenant()` is even reached.

### 6. Is the onboarding flow creating the database user?
**NO.** The application relies entirely on the Clerk Webhook (`/api/webhooks/clerk`) listening for the `user.created` event to provision the user and their tenant in the local database.

### 7. Is there a missing Clerk webhook or first-login sync?
**YES (ROOT CAUSE).** The application is running on `http://localhost:3000`. Clerk's external servers cannot send webhook HTTP POST requests to a `localhost` URL without a secure tunnel (like `ngrok` or the Clerk CLI forwarder). Because the webhook never reaches the local development server, the `user.created` event is lost, and the local database is never synchronized with Clerk. 

## Flow Trace

1. **Clerk:** User signs up/logs in. Clerk creates the user on their backend and dispatches a `user.created` webhook.
2. **Webhook (FAILED):** Clerk attempts to send the webhook, but it fails to reach `localhost:3000`. The local database remains empty.
3. **auth():** Returns the valid `userId` from the JWT cookie.
4. **getCurrentUser():** Queries Prisma for `clerkId = userId`.
5. **User query (FAILED):** Returns `null` because the webhook never created the user.
6. **Dashboard:** `requireAuth()` throws `Unauthorized` because `getCurrentUser()` returned `null`.

## Verification
I verified this by checking the local database (`prisma.user.findMany()`), which confirmed that the webhook synchronization did not happen. No speculative code changes have been made.
