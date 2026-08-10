# PHASE 6.8 CHECKPOINT IDEMPOTENCY REPORT

## 1. Chunk Identification
Every restore chunk is durably identifiable via the `RestoreCheckpoint` Prisma model:
`@@unique([recoveryJobId, phase, model, chunkIndex])`
This generates a deterministic `chunkId` (e.g. `job_123_phase2_customer_chunk0`).

## 2. Checkpoint Race Protection
The `RestoreWorker` validates idempotency at two explicit boundaries:
- **Boundary 1 (Pre-execution)**: It queries `RestoreCheckpoint`. If `status === 'COMPLETED'`, it gracefully acks the queue and skips execution without hitting the DB further.
- **Boundary 2 (Execution)**: It wraps the `model.createMany({ skipDuplicates: true })` AND the `tx.restoreCheckpoint.update({ status: 'COMPLETED' })` in a SINGLE bounded Prisma `$transaction`.

## 3. Worker Crash Scenarios
- **Worker dies before DB transaction**: BullMQ redelivers. Chunk executes normally.
- **Worker dies during DB transaction**: Postgres automatically rolls back the transaction because the socket disconnects. The `RestoreCheckpoint` remains `PENDING`. BullMQ redelivers. Chunk executes normally.
- **Worker dies after DB commit, before Queue Ack**: The Postgres commit succeeded. The `RestoreCheckpoint` is now `COMPLETED`. BullMQ redelivers the job due to lack of ACK. The next worker hits **Boundary 1**, sees `COMPLETED`, and instantly Acks the queue, doing no harm. 

## Verdict
**VERIFIED**. The system physically protects against duplicate execution and race conditions by intertwining the Checkpoint state with the DB row state inside the same atomic commit.
