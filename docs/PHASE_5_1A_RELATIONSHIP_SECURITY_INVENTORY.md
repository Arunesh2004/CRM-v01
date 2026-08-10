# PHASE 5.1A — MULTI-TENANT RELATIONSHIP OWNERSHIP INVENTORY

## 1. Relationship Map & Security Classification

| Child Model | Foreign Key | Parent Model | Parent Tenant | Child Tenant | Protection Classification |
|-------------|-------------|--------------|---------------|--------------|---------------------------|
| `Incident`  | `locationId`| `Location`   | `tenantId`    | `tenantId`   | ❌ NOT VERIFIED (VULNERABLE) |
| `Incident`  | `cameraId`  | `Camera`     | `tenantId`    | `tenantId`   | ❌ NOT VERIFIED (VULNERABLE) |
| `Incident`  | `aiEventId` | `AIEvent`    | `tenantId`    | `tenantId`   | ❌ NOT VERIFIED (VULNERABLE) |
| `Camera`    | `locationId`| `Location`   | `tenantId`    | `tenantId`   | ❌ NOT VERIFIED (VULNERABLE) |
| `Message`   | `conversationId`| `Conversation`| `tenantId`    | `tenantId`   | ❌ NOT VERIFIED (VULNERABLE) |
| `Task`      | `assignedUserId`| `User`       | `tenantId`    | `tenantId`   | ❌ NOT VERIFIED (VULNERABLE) |

## 2. Verified Attack Results
A test script (`scripts/phase5_1a_inventory.ts`) directly accessed Prisma bypassing the application layer to aggressively attach Tenant B's parent items to Tenant A's newly created items.
**Results:**
- `Incident -> LocationB`: **VULNERABLE** (Successfully created)
- `Camera -> LocationB`: **VULNERABLE** (Successfully created)
- `Message -> ConversationB`: **VULNERABLE** (Successfully created)
- `Task -> UserB`: **VULNERABLE** (Successfully created)

*Conclusion:* The database schema purely uses scalar IDs (e.g. `UUID`) for relations. Because IDs are unique globally, PostgreSQL natively allows linking `Tenant A's Incident` to `Tenant B's Location` unless compound foreign keys explicitly force the same `tenantId`.

## 3. Privilege Escalation Findings
- Application explicitly enforces `TENANT_ADMIN` scoping.
- Database layer `UserRole` table allows assigning any `roleId` to any `userId` across tenants. It lacks a compound `tenantId` constraint, placing 100% of the burden on the API controllers to prevent privilege leakage.

## 4. Tenant Context Findings
- `tenantId` is safely drawn from `auth.ts` -> `getCurrentUser().tenantId`, not from spoofable headers. 
- The middleware successfully rejects explicit client tampering since session data relies strictly on backend DB associations with `clerkId`.

## 5. Migration Impact Analysis (If we use Compound Foreign Keys)
- **Affected Models:** Every model using a relationship (`Incident`, `Location`, `Camera`, `Message`, `Task`, `Call`, `Conversation`, `Lead`, `Customer`, etc.)
- **Existing Production Data Risks:** High. We would need to drop scalar foreign key constraints, recreate them as compound arrays, and guarantee that the `tenantId` matches flawlessly in the existing data or face massive constraint violations during the migration.
- **Downtime Requirements:** High (Complete table lock during migration constraint rebuilding).
- **Backward Compatibility:** All existing Prisma `create` queries would need to be checked; however, since Prisma handles compound keys decently if `tenantId` is provided at the root, the application-level query impact is moderate.

## 6. Recommended Hardening Strategy

**Option C: Hybrid Approach (Recommended)**
1. **Service-Layer Enforcement (Immediate & Low Risk):** Since the API securely scopes reads with `where: { tenantId }`, we can introduce strict `tenantId` assertion checks inside all `POST/PUT` server actions before performing `prisma.create`. This fixes the vulnerabilities without massive database migration risk.
2. **Database Soft-Hardening:** Introduce `@@unique([id, tenantId])` to parent models, but rely on Prisma middleware to enforce constraints in the interim rather than attempting a high-risk multi-table FK teardown on live schemas.

## FINAL DECISION
**RELATIONSHIP INVENTORY COMPLETE**
**READY FOR HARDENING DECISION**
