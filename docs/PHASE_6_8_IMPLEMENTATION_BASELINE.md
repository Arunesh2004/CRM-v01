# PHASE 6.8 IMPLEMENTATION BASELINE

## Target Components
The following files will undergo significant architectural changes:
- `src/modules/recovery/restore.engine.ts` (To be split into Coordinator and Worker logic).
- `src/lib/queue/JobQueueProvider.ts` (To be implemented).
- `database/schema.prisma` (To introduce durable checkpoints).

## Preserved Components
The following verified security components MUST NOT change:
- `export.engine.ts` (Envelope encryption works perfectly).
- `BackupSchedulerService` (Idempotent job locks are secure).
- `S3CompatibleStorageProvider` (Isolation works).
- `CloudKMSProvider` (Key boundaries are secure).

## Database Additions
- Model: `RestoreCheckpoint` (To track chunk completion, phase, and state durably).

## Known Limitations Before Modification
- The current restore uses a single monolithic `$transaction`.
- Queue is purely an interface; no real workers exist.
- Redis is not guaranteed to be highly available in this environment.
