# Backup Trigger Production Architecture

## Overview
The `BackupSchedulerService` provides internal orchestration to systematically trigger exports for all tenants. In a production environment, this service cannot trigger itself; it requires an external Cron stimulus (e.g., Vercel Cron, Kubernetes CronJob, or AWS EventBridge).

## Webhook Strategy
To connect external scheduling systems to the internal cluster, we expose a highly secured REST API endpoint: `POST /api/internal/backup/run`.

### Architecture Flow
1. **Cloud Scheduler** (e.g., AWS EventBridge) is configured with a CRON expression (e.g., `0 * * * *` for hourly).
2. The Cloud Scheduler prepares an HTTP POST request.
3. **Payload Generation**: It generates a signed payload using a secure pre-shared key (PSK) shared between the Scheduler and the SaaS Application.
4. The SaaS API Route intercepts the POST request.
5. **Security Middleware**:
   - Computes an HMAC SHA256 signature using the known PSK.
   - Compares the expected signature to the provided `X-Scheduler-Signature` using `crypto.timingSafeEqual` to prevent timing attacks.
   - Parses the `timestamp` included in the signed payload. Rejects any request older than 5 minutes to mitigate **Replay Attacks**.
6. **Execution**: If the request is authentic, the endpoint invokes `BackupSchedulerService.triggerBackupCycle()`.
7. **Concurrency Failsafe**: Due to the database-level advisory locks `pg_advisory_xact_lock` configured in Phase 6.2, even if the webhook fires concurrently across a clustered deployment (e.g., 10 API instances receive the trigger), only exactly one cluster node successfully acquires the lock and initiates the DR cycle.

## Configuration Requirements
- `INTERNAL_SCHEDULER_SECRET`: A 256-bit cryptographically secure random string shared exclusively between the Cloud Scheduler and the SaaS environment variables.
