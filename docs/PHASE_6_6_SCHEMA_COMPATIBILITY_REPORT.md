# PHASE 6.6 RECOVERY SCHEMA COMPATIBILITY REPORT

## Current State Audit
The `RecoverySnapshot` model currently persists the deterministic schema footprint at the time of backup via two fields:
- `schemaVersion`: Hardcoded to `'1.0'`
- `backupFormatVersion`: Hardcoded to `'1'`

During Disaster Recovery ingestion (`restore.engine.ts`), the system strictly evaluates the ingested metadata against the active runtime:
```typescript
if (snapshot.schemaVersion !== '1.0' || snapshot.backupFormatVersion !== '1') {
  throw new Error('Incompatible backup version.');
}
```

## Architectural Danger
If the CRM application pushes a Prisma schema change (e.g. dropping a column, renaming a relationship, splitting a model) and bumps the active version to `2.0`, the system will rigidly refuse to ingest older `1.0` disaster recovery snapshots. The application will be unable to restore its historical data.

## Schema Migration Engine Architecture (Future Requirement)
The system MUST implement a version translation adapter sequence.

### Target Flow
1. **Metadata Verification**: The engine parses the `schemaVersion` from the decrypted payload.
2. **Version Divergence Detection**: If `payload.schemaVersion` !== `RUNTIME_SCHEMA_VERSION`, the engine halts direct DB insertion.
3. **Migration Pipeline Trigger**: The engine dynamically invokes a sequential Transformation pipeline. 

### Implementation Example:
```typescript
interface SchemaAdapter {
  fromVersion: string;
  toVersion: string;
  transform: (payload: any) => Promise<any>;
}

// Example Adapter: V1 to V2
const V1_to_V2_Adapter: SchemaAdapter = {
  fromVersion: '1.0',
  toVersion: '2.0',
  transform: async (payload) => {
    // e.g. "Customer.oldField" -> "Customer.newField"
    payload.customers = payload.customers.map(c => {
       c.newField = c.oldField;
       delete c.oldField;
       return c;
    });
    return payload;
  }
}
```

### Safety Guarantees
- The DR engine MUST NOT silently attempt to map old fields to new constraints (which would result in catastrophic SQL failures deep inside the transaction block).
- It must explicitly return `SCHEMA_MIGRATION_REQUIRED` if an adapter path between the `snapshot.schemaVersion` and `current application schema` does not exist.

## Status Verdict
The current strict rejection guarantees that corrupted shapes won't pollute the database. However, this architectural constraint severely limits the long-term backwards compatibility of archived backups. The adapter pattern documented here will be strictly required once the CRM model scales past Version 1.0.
