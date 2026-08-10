# PHASE 6.8 RESTORE ENGINE ARCHITECTURE REPORT

## Why the Existing Transaction Fails at Scale
The existing architecture uses a single Prisma transaction: `prismaAdmin.$transaction(async (tx) => { ... })`. Inside this transaction, it maps `payload.customers`, `payload.leads`, etc., and bulk-inserts them. 
At 1M records, the JSON payload expands to hundreds of megabytes. Node.js V8 attempts to load this massive AST into the heap, instantly triggering an OOM (Out Of Memory) crash. Even if Node survives, Postgres will abort the transaction because the sheer volume of locks held across multiple interrelated tables blocks all other concurrent tenant operations, and usually trips the transaction timeout limit.

## The New Event-Driven Design
We will replace the monolithic restore with the **SAGA Pattern**:
`STREAM -> VALIDATE -> PLAN -> CHUNK -> QUEUE -> WORKER -> CHECKPOINT -> VERIFY -> COMPLETE`

1. **STREAM**: The backup blob is streamed from S3. Instead of parsing the entire JSON at once, we use an asynchronous streaming JSON parser (e.g. `JSONStream` or chunked reading).
2. **PLAN**: The Coordinator creates a deterministic Execution Plan, breaking the entity tree into logical phases (Tenant -> Users -> Customers -> Leads -> Tasks) based on the Dependency Graph.
3. **CHUNK**: Each phase is broken down into 10,000-record chunks.
4. **CHECKPOINT**: The engine persists a `RestoreCheckpoint` state to Postgres (e.g., Phase: Customers, Chunk: 4 completed).
5. **QUEUE**: The Coordinator pushes each chunk independently to BullMQ.
6. **WORKER**: A stateless worker consumes the chunk, executes a small, bounded `$transaction` for just those 10,000 records, updates the Checkpoint, and acks the queue.

## Consistency & Resiliency Guarantees
- **Partial Restore States**: Since we no longer use a single transaction, a failed restore might leave a tenant "half restored". To mitigate this, the application UI must lock tenant access until the `RecoveryJob` state transitions to `COMPLETED`. 
- **Rollback / Recovery**: Rollbacks of massive datasets are structurally dangerous. Instead of Rollback, the engine supports **Forward Recovery** (Resumability). If a worker crashes, the `RestoreCheckpoint` knows exactly which chunk failed. BullMQ automatically retries the failed chunk.
- **Idempotency**: Every chunk payload will be injected with `skipDuplicates: true` and Upsert mechanics where necessary. The worker can execute Chunk 42 five times without causing duplicate Customer IDs, because the primary keys are preserved from the backup.
