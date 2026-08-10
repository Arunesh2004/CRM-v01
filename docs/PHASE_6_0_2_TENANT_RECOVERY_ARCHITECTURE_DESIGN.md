# PHASE 6.0.2 TENANT RECOVERY ARCHITECTURE DESIGN

## Objective
Design the specific mechanics for extracting a complete Tenant boundary into a self-contained JSON artifact, and securely re-hydrating it into the system without causing cross-tenant corruption.

## 1. Export Architecture (`tenant.json`)

### Streaming Extraction
To prevent V8 Out-Of-Memory (OOM) crashes, the export engine will use cursor-based pagination (e.g., chunking by 5,000 records) to stream data directly into a compressed `.json.gz` file.

### Payload Structure
```json
{
  "metadata": {
    "tenantId": "uuid",
    "exportDate": "ISO8601",
    "schemaVersion": "1.0",
    "checksum": "sha256-hash-of-payload"
  },
  "identity": {
    "tenant": { ... },
    "users": [ { ... } ],
    "roles": [ { ... } ]
  },
  "crm": {
    "customers": [ { ... } ],
    "leads": [ { ... } ],
    "tasks": [ { ... } ]
  },
  "communications": {
    "conversations": [ { ... } ],
    "messages": [ { ... } ],
    "calls": [ { ... } ]
  },
  "security": {
    "incidents": [ { ... } ],
    "auditLogs": [ { ... } ]
  }
}
```

## 2. Restore Architecture (Hydration)

### Validation Pipeline
Before a single row is inserted, the import engine MUST validate:
1. **Checksum:** Verifies the archive was not tampered with.
2. **Tenant Ownership:** Validates the initiating Admin possesses the cryptographic keys or `ownerId` override for this specific Tenant.
3. **Collision Detection:** Verifies the `tenantId` does not currently exist in the database (to prevent duplicate primary key crashes).

### Dependency Hydration Order
Foreign key constraints dictate the exact order of insertion:
1. `Tenant` -> `Role` -> `User` (Identity)
2. `Customer` -> `Lead` -> `Location` (Core CRM)
3. `Task` -> `Conversation` -> `Message` (Dependencies)
4. `AuditLog` (Historical trace)

### Rollback Safety
The entire hydration process runs inside a massive `$transaction` (or batched transactions if size exceeds limits). If a single record violates schema integrity, the database rolls back the entire insertion, guaranteeing we never have a "partially restored" ghost tenant.
