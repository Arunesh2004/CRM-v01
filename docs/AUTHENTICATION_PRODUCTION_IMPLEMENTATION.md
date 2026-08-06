# Authentication Production Reality Fix

## Issue Identified
Phase A's Reality Audit exposed that while `requireAuth()` and `requireTenant()` structurally protected backend actions, there was no actual production synchronization linking a Clerk user signup to the local PostgreSQL database (`User`, `Tenant`, and `Role` records). This meant the SaaS could not naturally onboard new organizations.

## Implementation Details
1. **Webhook Endpoints**: Created `src/app/api/webhooks/clerk/route.ts` using Next.js Edge-compatible route handlers.
2. **Event Parsing**: Bound to Clerk's `user.created`, `user.updated`, and `user.deleted` streams.
3. **Automated Tenant Provisioning**: 
   - When `user.created` triggers, the payload's `public_metadata` is checked.
   - If no `tenantId` is found (implying a brand new company sign-up), a fresh `Tenant` record is securely initialized inside a `$transaction`.
4. **Role Assignment**: Automatically assigns `TENANT_ADMIN` to the founder, or `MEMBER` if they were invited to an existing `tenantId`.

## Security Decisions
- **Cryptographic Signature Verification**: Implemented standard `svix` verification using `wh.verify(body, headers)` to reject spoofed webhooks.
- **Server-Side Trust**: We never blindly trust client-side payloads for tenant assignment. Assignment only occurs securely via signed Webhook metadata (or fallback creation of a new isolated tenant).
- **Atomic Transactions**: Local User creation, Role mapping, and Tenant generation are all bound within `prisma.$transaction()`, meaning a partial failure will completely roll back without leaving orphaned users.

## Testing
Simulated tests (`tests/auth-production.test.ts`) executed via CLI confirmed:
- Invalid signatures correctly drop requests with HTTP 400.
- Valid payloads successfully execute the Prisma `$transaction` inserting the `User` and tracking `tenantId`.
