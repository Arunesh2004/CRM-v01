# Database Architecture and Schema Design

## 1. Database Design Principles

The database follows a **Shared Database + Shared Schema** strategy with strict tenant isolation.

### Tenant Isolation Strategy
To guarantee strict tenant isolation, every table belonging to a tenant must include a `tenantId`.

### Data Ownership
- The **Platform** owns global data.
- The **Tenant** (Company) owns all business-specific data.

### Relationship Rules
- Tenant-owned entities must *only* relate to other entities belonging to the same tenant.

### Audit Requirements
Every tenant-owned table must include:
- `tenantId` (String/UUID)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

---

## 2. Core Entity Design

### A. Platform Management
- **Company**: Represents a single tenant. The core isolation boundary.
- **User**: Represents individuals accessing the system.
- **DeviceSession**: 
  - *Purpose*: Tracks active sessions, connected devices, and login history to enable remote logout capabilities.
  - *Fields*: `id`, `userId`, `deviceInfo`, `ipAddress`, `lastActive`, `isValid`.
- **TenantIntegration**: 
  - *Purpose*: Securely stores tenant-specific integrations (e.g., WhatsApp credentials, Email providers).
  - *Security*: Do not store secrets directly in plaintext. Access tokens and API keys must be symmetrically encrypted at rest in the database and decrypted only in memory when used.
- **Role**: Defines a group for permissions.
- **Permission**: 
  - *Purpose*: Maps specific granular access rights. Replaces simple role-only permissions.
  - *Fields*: Consists of a **Role** + **Resource** + **Action**. 
  - *Example*: Resource = `Incident`. Actions = `CREATE`, `READ`, `UPDATE`, `DELETE`, `RESOLVE`. This enables extremely fine-grained RBAC.
- **AuditLog**: Immutable record of critical actions.

### B. CRM Module
- **Lead**: Potential customer.
- **ActivityTimeline**: Interactions with a Lead or Customer (Notes, Emails, Calls).
- **Customer**: Converted client.
- **CustomerContact**: Individual people associated with a Customer.
- **Location**: Physical sites associated with a Customer.
- **Task**: Actionable items optionally linked directly to a Lead or Customer.

*Relationships*: `Company` → `Customers` → `Locations` → `Tasks`

### C. Communication Module
- **Conversation**: Logical grouping of messages/calls.
- **Message**: Single text/WhatsApp/internal message.
- **Email**: Represents an inbound or outbound email.
- **EmailThread**: Groups related Emails.
- **Call**: Record of a voice/video call.
- **CallRecording**: Media file associated with a Call.
- **Attachment**: Files attached to messages or emails.

### D. Security Operations Module
- **Camera**: A physical CCTV or security device.
- **CameraHealth**: Time-series health status. 
  - *Strategy*: Do not treat it as normal relational history. 
  - *Option*: Utilize the **TimescaleDB extension** OR an optimized time-series storage strategy.
  - *Why required*: Normal relational tables degrade quickly with massive, constant time-series inserts.
  - *Data retention & Aggregation*: Raw health events are retained for 90 days. Aggregated statistics (e.g., daily uptime percentages) are kept for long-term storage.
- **Alert**: An automated trigger from a Camera or system.
- **Incident**: A formal security event requiring investigation.
- **Evidence**: Files, clips, or snapshots tied to an Incident.
- **SecurityReport**: Generated summaries of Incidents over time.

### E. Billing Module
- **Plan**: Global templates for subscription tiers.
- **Subscription**: A Company's active billing agreement.
- **Invoice**: Generated bill.
- **Payment**: Transaction settling an Invoice.

---

## 3. Entity Relationship Design

- **Primary Keys**: UUID or CUID for global uniqueness.
- **Foreign Keys**: Enforce referential integrity.
- **One-to-One**: `Company` to `Subscription`.
- **One-to-Many**: `Company` to `Users`, `Location` to `Cameras`, `User` to `DeviceSession`.
- **Many-to-Many**: `User` to `Role`.

---

## 4. Indexing Strategy

- **tenantId lookup**: Compound index on `(tenantId, id)`.
- **customer search**: Trigram or full-text index on `Customer(name, email)`.
- **camera status**: Index on `Camera(status, locationId)`.
- **active alerts**: Partial Index on `Alert(status) WHERE status = 'ACTIVE'`.
- **incident history**: Index on `Incident(createdAt DESC, tenantId)`.
- **communication timeline**: Index on `Message(conversationId, createdAt)`.

---

## 5. Data Security Design

### Tenant Isolation Approach
Every service-layer database query strictly enforces the `tenantId`.

### Prevention Strategies
- **Prisma Client Extensions**: Automatically inject `WHERE tenantId = currentTenant` into every ORM operation.
- **PostgreSQL Row-Level Security (RLS)**: Even if a developer bypasses Prisma extensions, PostgreSQL physically rejects access to rows that do not match the current session's tenant setting.

---

## 6. Audit System Design

The immutable `AuditLog` tracks actions.
**Fields**: `id`, `tenantId`, `userId`, `action`, `resource`, `resourceId`, `timestamp`, `ipAddress`, `metadata`.

---

## 7. Future Scalability

- **10 Companies**: Standard B-Tree indexes.
- **100 Companies**: Application-level caching (Redis) and tenant-level rate limiting.
- **1000+ Companies**:
  - **Partitioning**: Partitioning tables by date/tenantId.
  - **Read Replicas**: Offload reporting to replicas.
  - **Time-Series DB**: Extract CCTV health metrics entirely into TimescaleDB.

---

## 8. Database Decisions

- **Shared Database + Shared Schema**: Lowest operational overhead for MVP. Tradeoff mitigated heavily by RLS.
- **Prisma ORM**: Superior DX.
- **UUIDs/CUIDs**: Prevents enumeration attacks.

Schema implementation started.
