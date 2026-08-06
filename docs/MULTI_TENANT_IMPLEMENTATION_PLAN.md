# Multi-Tenant Implementation Plan

## 1. Tenant Context Flow
- **Clerk User**: The incoming request provides a valid JWT containing the `clerkId`.
- **Internal User Lookup**: The `getCurrentUser()` utility fetches the internal `User` record mapped to this `clerkId`.
- **`tenantId` Extraction**: The `User` record inherently contains the strict `tenantId`.
- **Request Context**: This `tenantId` becomes the absolute boundary for the duration of the request lifecycle. It is never read from client-provided payloads or URL parameters for security checks.
- **Database Queries**: All subsequent Prisma queries must explicitly filter by this server-derived `tenantId` to guarantee isolation.

## 2. Prisma Tenant Protection
- **Service Layer Protection**: Every service function (e.g., `getIncidents`, `createAuditLog`) requires `tenantId` as a mandatory parameter derived from the server-side context, never from the client payload.
- **Prisma Extension/Middleware**: We will implement a Prisma Client Extension (Client-level middleware) that automatically intercepts queries (like `findMany`, `update`, `delete`) and implicitly appends `{ where: { tenantId } }`. This acts as an application-layer safety net to prevent developers from accidentally querying across tenants.
- **Future PostgreSQL RLS**: While Prisma extensions provide application-layer protection, future Row-Level Security (RLS) policies will be enforced at the Postgres connection level using `current_setting('app.current_tenant')`, acting as the ultimate, unbreakable database-layer barrier.

## 3. Authorization Flow
The lifecycle of every protected operation follows a strict linear sequence:
1. **Request**: The client invokes a Next.js Server Action or API Route.
2. **Authentication**: Clerk middleware validates the active JWT session.
3. **Tenant Validation**: The server securely fetches the internal `User` and extracts the bound `tenantId`.
4. **Permission Check**: The `checkPermission(Resource, Action)` utility asserts the user's RBAC matrix (e.g., `INCIDENT`, `CREATE`).
5. **Business Logic**: Only after passing all previous checks does the actual mutation or query execute against the database.

## 4. Server Action Security
**Enforcement Rules**:
Every single Server Action (mutation or query) MUST verify:
- **Authenticated User**: Ensure `getCurrentUser()` does not return null.
- **Tenant Membership**: Ensure the user has an active `tenantId`. If a client payload provides a target `tenantId` (e.g., for cross-tenant operations), it MUST be strictly compared and rejected if it doesn't match the authenticated user's `tenantId` (unless they possess `GLOBAL_ADMIN` privileges).
- **Permission**: The exact `Resource` and `Action` must be verified via `checkPermission()` before any Prisma call is made.

## 5. Cross Tenant Attack Prevention
**Example Attack**: 
User from Tenant A attempts a POST request (e.g., updating a camera configuration) but maliciously alters the hidden payload to `tenantId=TenantB`.

**Expected Result**: **Access Denied.**
**Protections in place**:
- **Trust No Client Input**: The server completely ignores the client's `tenantId` payload for authorization. It uses the `tenantId` derived from the securely verified Clerk JWT -> Internal User mapping.
- **Forced Scoping**: Even if the payload contains `tenantId=TenantB`, the Prisma Extension and Service Layer will forcefully inject `{ where: { tenantId: 'TenantA' } }`. The query will simply return `RecordNotFound` or `AccessDenied`.
- **Immutability**: `tenantId` on the `User` record is immutable and cannot be altered via standard API endpoints.

## 6. Testing Strategy
- **Tenant Isolation**: Write unit/integration tests executing operations using a `User` from `Tenant A` and asserting that `Tenant B`'s records are completely invisible and un-modifiable.
- **Permission Denial**: Test that a `User` with `Action.READ` on `Resource.INCIDENT` receives an immediate 403 Forbidden when attempting an `Action.CREATE` request.
- **Unauthorized Access**: Test that omitting the Clerk JWT or providing an expired/invalid token immediately halts execution before any database connection is attempted.
