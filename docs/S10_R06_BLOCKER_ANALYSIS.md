# S10 R06 Blocker Analysis: Recording Root Contract

## 1. Scope
This document analyzes the architectural blocker preventing the implementation of CCTV-R06 (`localFilePath` validation in the ingestion daemon). It traces the recording path lifecycle, evaluates repository evidence for filesystem contracts, and proposes the minimum architectural changes required to unblock the security remediation.

## 2. Recording Lifecycle
1. **MediaMTX configuration**: `stream.service.ts` statically provisions paths using `recordPath: '/var/lib/mediamtx/recordings/%path/%Y-%m-%d_%H-%M-%S.mp4'`.
2. **MediaMTX event**: On segment completion, MediaMTX POSTs to the CRM webhook, sending the raw file path (`$MTX_SEGMENT_PATH`) in the payload as `file`.
3. **Webhook reception**: `src/app/api/webhooks/mediamtx/record/route.ts` parses the `file` field into `localFilePath`, rejects paths containing `..` or absolute basenames, and persists the full string into `RecordingIngestionJob`.
4. **Daemon consumption**: `src/workers/cctv-ingestion-daemon.ts` reads `localFilePath` from the job and directly accesses it via `fs.stat`, `uploadFile` (which wraps `fs.createReadStream`), `fs.unlink`, and `fs.rename` (for quarantine).

## 3. Filesystem Path Flow
- **A. MediaMTX provisioning path**: Hardcoded to `/var/lib/mediamtx/recordings/` inside the application code.
- **B. Job persistence (localFilePath)**: An absolute path on whatever filesystem MediaMTX is writing to (e.g., `/var/lib/mediamtx/recordings/...`).
- **C. Worker access**: The daemon assumes the path in `localFilePath` is accessible locally using Node.js `fs` module.
- **D. Storage object key**: The daemon securely derives an S3 storage key entirely independent of `localFilePath`, mapped by database identifiers (`cctv_recordings/${tenantId}/${cameraId}/v${streamVersion}/${job.segmentId}.mp4`).

## 4. Configuration Evidence
- `.env.example`, `.env.local`, and `env.ts` contain NO configuration keys referencing a recording directory or MediaMTX filesystem root.
- There is no `MEDIAMTX_RECORDINGS_ROOT`, `CCTV_RECORDINGS_ROOT`, or similar variable defined anywhere in the application config.

## 5. Docker / Container Evidence
- `docker-compose.yml` defines the `app` and `worker` services.
- Neither service mounts a volume for `/var/lib/mediamtx/recordings`.
- MediaMTX itself is not defined in `docker-compose.yml`.
- **Conclusion**: Production filesystem mapping between MediaMTX and the CRM worker is not represented in repository evidence.

## 6. Test Evidence
- Tests (`cctv-ingestion-daemon.test.ts`, `cctv-c11-architecture.test.ts`) dynamically generate paths in `/tmp` (e.g., `path.join('/tmp', opaquePath, '${segmentId}.mp4')`).
- If the daemon were hardcoded to validate against `/var/lib/mediamtx/recordings`, it would instantly break the existing test architecture because tests write and read from `/tmp`.

## 7. Exact Blocker
The repository lacks a single authoritative filesystem-root contract. The ingestion daemon cannot enforce a trusted root boundary because no trusted root is globally configured.
- The daemon cannot hardcode `/var/lib/mediamtx/recordings` because tests use `/tmp`.
- The daemon cannot dynamically trust `localFilePath` because the webhook blindly accepts whatever MediaMTX sends.
- The daemon cannot rely on an environment variable because none exists.

## 8. Security Implications
Without a trusted root configuration, the ingestion daemon is forced to blindly trust the absolute path string persisted in the database. A malicious database modification or a queue-poisoning attack could cause the privileged daemon to read, delete, or upload arbitrary files from the worker's filesystem (e.g., `/etc/passwd`).

## 9. Minimum Contract Required
Before R06 can be safely implemented, the architecture must establish:
1. **A trusted recording input root** configured centrally.
2. **A server-only configuration variable** (e.g., `process.env.CCTV_RECORDINGS_ROOT`) to specify the root.
3. **A unified test overriding mechanism** where tests supply a temporary directory and the application respects it natively without weakening production security.
4. **A shared container volume contract** (if deployed via Docker) to guarantee that MediaMTX and the CRM worker access the exact same path.

## 10. Proposed Implementation Plan
*Do NOT implement these changes in the current task.*
1. **Introduce `CCTV_RECORDINGS_ROOT`**: Add this to `src/lib/config/env.ts`, defaulting to `/var/lib/mediamtx/recordings` in production, and dynamically resolving to `/tmp` in test environments.
2. **Update Provisioning**: Modify `stream.service.ts` to use `CCTV_RECORDINGS_ROOT` when issuing the `recordPath` to MediaMTX.
3. **Update Webhook**: Modify the webhook to validate that the incoming path resides within `CCTV_RECORDINGS_ROOT` before persisting it.
4. **Implement R06 (Daemon Enforcement)**: In the daemon, explicitly re-validate that `job.localFilePath` resolves strictly inside `CCTV_RECORDINGS_ROOT` before executing any filesystem operation. This requires a `realpath` containment check to defend against symlink attacks.
5. **Update Infrastructure**: If Docker is used in production for both, ensure a shared volume maps `CCTV_RECORDINGS_ROOT` across both the `mediamtx` and `worker` containers.

## 11. Production Dependencies
To fully complete this work, the infrastructure deployment (Ansible, Helm, or Docker Compose in production) must be updated to guarantee the shared volume mapping between the MediaMTX instance and the Node.js worker instance.

## 12. Final Classification
**R06: BLOCKED**
