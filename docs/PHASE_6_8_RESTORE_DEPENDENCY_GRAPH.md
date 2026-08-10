# PHASE 6.8 RESTORE DEPENDENCY GRAPH

## Methodology
The actual foreign keys defined in `database/schema.prisma` have been analyzed to construct a deterministic, topological execution order. Because Prisma's `skipDuplicates: true` and `createMany` do not resolve deferred foreign key constraints natively, objects MUST be inserted strictly after their parent dependencies exist.

## Architectural Graph

### PHASE 1: ROOT TENANCY
- `Tenant` (Root object. No dependencies except `ownerId`, which we nullify initially and patch at the end of the Phase 1 SAGA to prevent cyclic dependencies with User).

### PHASE 2: ACCESS CONTROL & IDENTITY
- `Role` (Depends on `Tenant`)
- `User` (Depends on `Tenant`)
- `UserRole` (Depends on `User`, `Role`)
- `DeviceSession` (Depends on `User`, `Tenant`)

### PHASE 3: CRM CORE ENTITIES
- `Location` (Depends on `Tenant`)
- `Customer` (Depends on `Tenant`)
- `CustomerContact` (Depends on `Customer`, `Tenant`)
- `Lead` (Depends on `Tenant`, `User`, `Customer`)
- `Task` (Depends on `Tenant`, `User`, `Customer`, `Lead`)
- `ActivityTimeline` (Depends on `Tenant`, `User`, `Customer`, `Lead`)

### PHASE 4: CCTV & PHYSICAL SECURITY
- `Camera` (Depends on `Tenant`, `Location`)
- `CameraCredential` (Depends on `Camera`)
- `CameraStream` (Depends on `Camera`)
- `Recording` (Depends on `Camera`)
- `CameraEvent`, `AIEvent` (Depends on `Camera`)
- `Incident` (Depends on `Tenant`, `Camera`, `User`)

### PHASE 5: COMMUNICATION & TELEMETRY
- `Conversation`, `Message`, `MessageAttachment` (Depends on `Tenant`, `User`, `Customer`)
- `Call`, `CallParticipant`, `CallRecording`, `CallTranscript` (Depends on `Tenant`, `User`, `Customer`)
- `EmailThread`, `EmailMessage`, `EmailAttachment` (Depends on `Tenant`, `User`, `Customer`)
- `Notification`, `NotificationPreference` (Depends on `Tenant`, `User`)

### PHASE 6: BILLING & WEBHOOKS
- `PaymentCustomer`, `Subscription`, `Invoice`, `Payment`, `UsageEvent` (Depends on `Tenant`, `Customer`)
- `TenantIntegration`, `WebhookEvent` (Depends on `Tenant`)

### PHASE 7: AUDIT & CLEANUP
- `AuditLog` (Depends on `Tenant`. Note: Usually ignored during restore to prevent over-writing immutable historical DR triggers, but structurally depends on Tenant).
- `Tenant.ownerId` (Patch cyclic update).

## Nullable Dependencies
- `Tenant.ownerId` is nullable. It MUST be inserted as NULL and updated at the end of Phase 2 after the `User` is created.
- `Lead.assignedToId`, `Task.assignedToId` are nullable.

## Cyclic Dependencies
The only direct cyclic graph is `Tenant -> User (ownerId)` and `User -> Tenant (tenantId)`. This is resolved by inserting `Tenant` with `ownerId: null`, then inserting `User`, then `UPDATE Tenant SET ownerId = $1`.
