# PHASE 6.6 JOB INFRASTRUCTURE REPORT

## Architecture Replacement
The Disaster Recovery Module has successfully eliminated synchronous runtime execution of heavy Backup/Restore streaming engines. We have established a `JobQueueProvider` abstraction designed for Distributed Microservice Workers.

### Current Implementation Limits
Previously, `BackupSchedulerService` executed `exportTenant()` immediately inside the same Node.js thread that received the HTTP trigger.
- **Risk 1: Memory Exhaustion**: V8 heaps would rapidly breach memory limits during multiple concurrent JSON streams.
- **Risk 2: Execution Timeout**: Serverless environments forcefully terminate lambdas after 10–60 seconds, which would sever the AES-256 pipeline mid-flight and leave a corrupted encrypted object on storage.

### Queue Abstraction Topology
The `JobQueueProvider` explicitly detaches the Engine from the Trigger API.
- **enqueue**: Persists the intent (`JobPayload`) to a distributed datastore (e.g., Redis via BullMQ, or AWS SQS).
- **consume**: Enables deploying detached, autoscaling Worker Services that long-poll the queue, entirely removed from the web-facing API.
- **retry / deadLetter**: Integrates exponential backoff and failed message routing to prevent silent data loss upon worker OOM exceptions or network severities.

## Threat Modeling: Queue Attacks
1. **Duplicate Jobs**: Prevented through the combination of Postgres `pg_advisory_xact_lock` (blocking DB state duplication) and the Queue provider's native deduplication constraints (e.g. BullMQ job IDs matching `RecoveryJob.id`).
2. **Tenant Starvation**: Enterprise tenants with massive backups could starve the queue. This is mitigated by implementing explicit Concurrency channels in the `consume()` method, isolating Enterprise queues from standard SLA queues.

## Verdict
This architecture decouples heavy I/O from the request lifecycle, ensuring horizontal elasticity and fulfilling enterprise background operational safety standards.
