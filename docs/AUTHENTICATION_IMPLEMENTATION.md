# Authentication Implementation

## Overview
Phase 2.1 introduces the implementation of Clerk Authentication tightly coupled with our Multi-Tenant database structure.

## Core Features Implemented
1. **Clerk Middleware**: `middleware.ts` configured to protect all routes by default, while exposing public signup, signin, and the webhook endpoints.
2. **Webhook Endpoint (`/api/webhooks/clerk`)**: Implements strict cryptographic verification using `svix`.
3. **Database Synchronization (Transactions)**: 
   - `user.created`: Checks for an existing `tenantId` in `publicMetadata` (for future organization invitations). If none exists, creates a new `Tenant`, `User`, `Role` (`TENANT_ADMIN`), and links them via `UserRole`, securely logged in `AuditLog`.
   - `user.updated`: Uses standard updates matching on `clerkId` to synchronize emails.
   - `user.deleted`: Performs a soft-delete (status = INACTIVE) on the `User` and invalidates any `DeviceSession`s to maintain the immutable `AuditLog` integrity.
4. **Auth Utilities (`src/lib/auth.ts`)**: Reusable server-side functions `getCurrentUser()`, `getCurrentTenant()`, and `checkPermission(resource, action)`.

## Future Enhancements
- Dedicated `WebhookEvent` table to guarantee extreme idempotency.
- Refined caching in `checkPermission()` to reduce PostgreSQL joins.
