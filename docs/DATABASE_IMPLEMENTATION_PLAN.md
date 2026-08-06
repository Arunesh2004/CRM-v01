# Database Implementation Plan - Core SaaS Schema

## 1. Multi Tenant Foundation

### Tenant/Company
- **Purpose**: Acts as the root logical isolation boundary for all data within the platform.
- **Fields**:
  - `id` (String, UUID)
  - `name` (String)
  - `status` (Enum: ACTIVE, SUSPENDED, PENDING)
  - `createdAt` (DateTime)
  - `updatedAt` (DateTime)
- **Relationships**:
  - `Company` has one-to-many relationships with `User`, `Role`, `AuditLog`, `DeviceSession`, and `TenantIntegration`.

## 2. User System

### User
- **Purpose**: Stores application-specific user profile data and handles authorization mapping.
- **Fields**:
  - `id` (String, UUID)
  - `clerkId` (String, Unique) - **Identity mapping**: Links the user to their Clerk authentication profile. The database delegates password and session token management entirely to Clerk.
  - `email` (String, Unique)
  - `tenantId` (String, UUID) - **Tenant relationship**: Associates the user with a specific Company.
  - `status` (Enum: ACTIVE, INACTIVE, INVITED)
  - `createdAt` (DateTime)
  - `updatedAt` (DateTime)
- **Relationships**:
  - Belongs to `Company` via `tenantId`.
  - Many-to-many with `Role` (via a join table or explicit relation).
  - One-to-many with `DeviceSession`.

## 3. Authorization System

### Role
- **Fields**: `id`, `name`, `tenantId`, `createdAt`, `updatedAt`.

### Permission
- **Fields**: `id`, `roleId`, `resource`, `action`.

### Resource & Action (Enums)
- **Resource Enum Examples**: `INCIDENT`, `CUSTOMER`, `CAMERA`, `USER`, `BILLING`.
- **Action Enum Examples**: `CREATE`, `READ`, `UPDATE`, `DELETE`, `RESOLVE`.

### Many-to-Many Relationships
- A `Role` has many `Permission`s. 
- A `User` has many `Role`s through a join table (e.g., `UserRole`). This enables highly flexible, fine-grained access control where a user can possess multiple roles (e.g., Agent + Editor) within their tenant.

## 4. Security Tracking

### DeviceSession
- **Purpose**: Tracks active logins to enable security monitoring and remote global logouts.
- **Fields**:
  - `id` (String, UUID)
  - `userId` (String, UUID)
  - `tenantId` (String, UUID)
  - `deviceInfo` (String) - E.g., User-Agent hash.
  - `ipAddress` (String)
  - `lastActive` (DateTime)
  - `isActive` (Boolean) - Revoking this logically invalidates the session.
  - `createdAt` (DateTime)

### AuditLog
- **Purpose**: Immutable ledger of all critical mutations.
- **Fields**:
  - `id` (String, UUID)
  - `tenantId` (String, UUID)
  - `userId` (String, UUID)
  - `action` (Enum)
  - `resource` (Enum)
  - `resourceId` (String)
  - `metadata` (JSONB) - Captures previous state and new state diffs.
  - `ipAddress` (String)
  - `timestamp` (DateTime, default now())

## 5. Tenant Integrations

### TenantIntegration
- **Purpose**: Securely stores external service credentials (WhatsApp, Resend) required for a specific company's workflows.
- **Fields**:
  - `id` (String, UUID)
  - `tenantId` (String, UUID)
  - `provider` (Enum: WHATSAPP, EMAIL, TELEPHONY)
  - `encryptedToken` (String) - **Security**: Keys are symmetrically encrypted at the application level using AES-256 before insertion. They are NEVER stored in plaintext.
  - `createdAt` (DateTime)
  - `updatedAt` (DateTime)

## 6. Prisma Design Rules

- **Primary Key Strategy**: All `id` fields will utilize `String @id @default(uuid())`.
- **UUID vs CUID**: We strictly use UUIDs (v4) to prevent enumeration attacks and ensure global uniqueness, which is crucial for SaaS security.
- **Enum Strategy**: Enums will be used for all static constraints (Status, Action, Resource, Provider) to ensure database-level data integrity.
- **Index Strategy**: We will utilize compound indexes. For any table belonging to a tenant, an index on `@@index([tenantId, id])` or `@@index([tenantId, createdAt])` will be applied to guarantee rapid tenant-filtered lookups.
- **Relation Rules**: All foreign keys enforcing a tenant relationship (`tenantId`) must have explicit referential actions (e.g., `onDelete: Cascade` for dependent entities, though we prefer soft-deletes via a status flag for critical records).

## 7. PostgreSQL RLS Preparation

### Tenant-Restricted Tables (Requires `tenantId`)
- `User`
- `Role`
- `Permission`
- `UserRole`
- `DeviceSession`
- `AuditLog`
- `TenantIntegration`

### Global Tables
- `Company` (The root table. Access here is restricted to Global Admins or specific row lookups by Company ID).

### RLS Preparation
When implementing `schema.prisma`, all tenant-restricted models will explicitly include a `tenantId` scalar field and a strict relation to the `Company` model. This structure natively supports our upcoming PostgreSQL Row-Level Security policies (e.g., `CREATE POLICY tenant_isolation ON "User" USING ("tenantId" = current_setting('app.current_tenant'));`).

## 8. Schema Review Checklist

- [x] No cross-tenant relationship possible (Ensured by strict `tenantId` cascading).
- [x] Required indexes exist (Compound indexing documented).
- [x] Audit capability exists (Immutable `AuditLog` defined).
- [x] RBAC supports future modules (Resource/Action enums provide infinite granularity).
- [x] Migration is reversible (Prisma handles up/down lifecycle).
