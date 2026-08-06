# CRM Implementation Plan

## 1. CRM Module Scope
The CRM module focuses on managing sales and operational pipelines for each tenant organization. 
**Core Entities:**
- **Lead**: Potential business opportunities.
- **Customer**: Converted leads (active organizations or individuals paying for services).
- **CustomerContact**: Specific human points of contact associated with a Customer.
- **Location**: Physical deployment sites or branch offices tied to a Customer (crucial for future CCTV module).
- **Task**: Actionable items assigned to users (e.g., follow-ups, site visits).
- **ActivityTimeline**: An immutable chronological record of events (notes, emails, calls, status changes) attached to any CRM entity.

## 2. Database Design
Every entity inherently belongs to a `Tenant` and enforces strict isolation.

### `Lead`
- **Purpose**: Track unqualified prospects.
- **Fields**: `id`, `tenantId`, `name`, `company`, `email`, `phone`, `status` (Enum: NEW, CONTACTED, QUALIFIED, LOST), `assignedUserId`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Tenant`, Belongs to `User` (Assignee), Has many `Task`, Has many `ActivityTimeline`.
- **Index Strategy**: `@@index([tenantId])`, `@@index([tenantId, status])`.

### `Customer`
- **Purpose**: Master record for an active business account.
- **Fields**: `id`, `tenantId`, `name`, `industry`, `status` (Enum: ACTIVE, INACTIVE, CHURNED), `assignedUserId`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Tenant`, Has many `CustomerContact`, Has many `Location`, Has many `Task`, Has many `ActivityTimeline`.
- **Index Strategy**: `@@index([tenantId])`, `@@index([tenantId, name])`.

### `CustomerContact`
- **Purpose**: Individual people working at a Customer organization.
- **Fields**: `id`, `tenantId`, `customerId`, `firstName`, `lastName`, `email`, `phone`, `isPrimary`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Tenant`, Belongs to `Customer`.
- **Index Strategy**: `@@index([tenantId, customerId])`.

### `Location`
- **Purpose**: Physical sites where security equipment (CCTV) will be installed.
- **Fields**: `id`, `tenantId`, `customerId`, `name`, `address`, `city`, `state`, `zip`, `coordinates`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Tenant`, Belongs to `Customer`.
- **Index Strategy**: `@@index([tenantId, customerId])`.

### `Task`
- **Purpose**: Actionable follow-ups.
- **Fields**: `id`, `tenantId`, `title`, `description`, `dueDate`, `status` (Enum: PENDING, IN_PROGRESS, COMPLETED), `assignedUserId`, `leadId`, `customerId`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Tenant`, Belongs to `User` (Assignee), Optional belongs to `Lead` or `Customer`.
- **Index Strategy**: `@@index([tenantId, assignedUserId, status])`.

### `ActivityTimeline`
- **Purpose**: Centralized notes and event tracking.
- **Fields**: `id`, `tenantId`, `type` (Enum: NOTE, EMAIL, CALL, SYSTEM), `content`, `actorId`, `leadId`, `customerId`, `createdAt`.
- **Relationships**: Belongs to `Tenant`, Belongs to `User` (Actor), Optional belongs to `Lead` or `Customer`.
- **Index Strategy**: `@@index([tenantId, customerId])`, `@@index([tenantId, leadId])`.

## 3. Customer Lifecycle
The progression of an entity through the sales funnel:
1. **Lead**: A prospect enters the system (e.g., via web form).
2. **Qualified Lead**: The lead meets criteria and is actively being pitched.
3. **Customer**: The lead converts (signs a contract). A `Customer` record is generated, the `Lead` is marked as CONVERTED, and historical data (Tasks, Timeline) is migrated or linked to the Customer.
4. **Active Relationship**: Contacts and Locations are added to the Customer. Support/Account management takes over via Tasks and Activities.

## 4. Permission Design
The CRM module extends the existing RBAC foundation. We will introduce new `Resource` enums (`LEAD`, `CUSTOMER`, `TASK`, `LOCATION`) and map standard `Action` enums (`CREATE`, `READ`, `UPDATE`, `DELETE`).

**Examples**:
- `LEAD:CREATE`, `LEAD:READ`, `LEAD:UPDATE`, `LEAD:DELETE`
- `CUSTOMER:CREATE`, `CUSTOMER:READ`, `CUSTOMER:UPDATE`, `CUSTOMER:DELETE`

These permissions will be assigned to Roles (e.g., `Sales Agent`, `Sales Manager`) via the `RolePermission` mapping table.

## 5. Tenant Isolation
CRM data utilizes the exact tenant enforcement architecture established in Phase 2.3:
- Every CRM model (`Lead`, `Customer`, etc.) explicitly includes a mandatory `tenantId`.
- The extended Prisma Client (`database/utils/prisma-tenant.ts`) will automatically intercept all queries and inject `where: { tenantId }`.
- Even if a `Sales Agent` attempts to fetch a Customer ID belonging to a different tenant, the Prisma extension enforces a hard boundary, returning `RecordNotFound` or `AccessDenied`.

## 6. Search Strategy
- **Customer Search**: Next.js Server Actions will execute case-insensitive `contains` queries on `Customer.name` and `CustomerContact.email`.
- **Lead Filtering**: Pre-built filters using indexed fields like `status` (e.g., `status = NEW`) and `assignedUserId`.
- **Activity Timeline Queries**: Ordered by `createdAt DESC` using pagination (cursor or offset) heavily reliant on compound indexes like `@@index([tenantId, customerId, createdAt])`.

## 7. Audit Requirements
To ensure a secure immutable history, the CRM service layer will automatically write to the `AuditLog` table for the following operations:
- **Creation**: Lead or Customer creation (`action: CREATE`).
- **Updates**: Significant changes to a Customer profile, such as status changes (Active -> Churned).
- **Deletion**: Hard/Soft deletion of any CRM entity.
- **Assignment Changes**: Transferring a Lead/Customer from one Sales Agent to another (critical for commission tracking and security boundaries).

## 8. Testing Strategy
- **Tenant Isolation Tests**: Ensure a User in Tenant A cannot read, update, or delete a Lead/Customer in Tenant B using the `withTenant` extension.
- **Permission Tests**: Verify that a user with only `CUSTOMER:READ` throws a `Forbidden` exception when invoking the `deleteCustomer` Server Action.
- **CRUD Tests**: Validate the correct progression of the Customer Lifecycle (Lead -> Customer conversion) and verify `AuditLog` entries are generated transactionally alongside the creation event.
