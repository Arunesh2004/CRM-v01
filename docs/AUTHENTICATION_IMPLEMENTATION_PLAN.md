# Authentication & Tenant Provisioning Design

## 1. Clerk Authentication Architecture
- **Clerk Responsibility**: Handling the core identity lifecycle—registration, login, passwords, multi-factor authentication (MFA), and active session token management (JWT generation).
- **Database Responsibility**: Storing application-specific user profiles (`User`), Multi-Tenant relations (`tenantId`), and strictly managing Role-Based Access Control (`UserRole`, `Role`, `Permission`).
- **JWT Flow**: The Next.js application will extract the active session JWT from Clerk on each request. The JWT payload will be trusted to identify the user's `clerkId`.
- **User Synchronization**: Real-time synchronization between Clerk and the application database will be strictly handled via secure Webhooks originating from Clerk.

## 2. Tenant Creation Flow
1. **New organization/company signup**: The user lands on the registration page and provides their company details and personal login info.
2. **Clerk user creation**: Clerk securely registers the identity and triggers a webhook event.
3. **Tenant creation**: The application receives the webhook, generates a new `Tenant` UUID in the database, and initializes the company profile.
4. **Database User creation**: A new `User` record is created mapping the `clerkId` to the newly generated `tenantId`.
5. **Default Admin Role assignment**: The system seeds a `Global Admin` Role for the tenant, assigns all permissions, and attaches it to the user via `UserRole`.

## 3. Webhook Security
All incoming Webhooks from Clerk must be strictly verified using the `svix` library.
- **Signature Verification**: Validate the `svix-signature` header against our application's `CLERK_WEBHOOK_SECRET` to guarantee the payload originated from Clerk.
- **Replay Protection**: Reject webhooks whose `svix-timestamp` is older than 5 minutes to prevent replay attacks.
- **Idempotency**: Use the `svix-id` (webhook event ID) to ensure that duplicate webhook deliveries do not result in duplicate database records or fatal errors. We will utilize database upserts to guarantee idempotency.

## 4. User Synchronization
- **`user.created`**: Database performs a strict transactional insert of the `Tenant`, the `User`, and the initial `UserRole` (for the primary owner). 
- **`user.updated`**: Database performs an `upsert` matching on `clerkId` to synchronize critical fields (e.g., email address updates).
- **`user.deleted`**: Database scrubs the user identity, executing a soft-delete (setting `UserStatus` to `INACTIVE`) to preserve immutable `AuditLog` integrity, while immediately invalidating active `DeviceSession`s.

## 5. Middleware Protection
- **Protected Routes**: Next.js `middleware.ts` will wrap the entire application (excluding public `/api/webhooks` and marketing pages) using `clerkMiddleware()`.
- **Tenant Context Injection**: Once authenticated, the middleware (or root layout) verifies the `User`'s `tenantId` from the database and injects it into the request context (or Next.js headers) for downstream Server Actions.
- **Authorization Checks**: Downstream controllers will enforce RBAC by verifying if the user possesses the correct `Permission` for the requested `Resource` and `Action`.

## 6. First Admin Setup
- **First tenant user**: The first user registering a new company automatically becomes the primary owner.
- **Default role**: `Tenant Admin`.
- **Default permissions**: Granted absolute access to all core platform resources and actions within their isolated `tenantId`.

## 7. Security Checklist
- [x] **No password storage**: All credential management is offloaded to Clerk.
- [x] **Tenant isolation**: Strict `tenantId` cascading is enforced during user provisioning.
- [x] **Webhook security**: `svix` library enforces cryptographic validation.
- [x] **Permission enforcement**: Admin roles are assigned cleanly via joining tables, ensuring the RBAC foundation is primed.
