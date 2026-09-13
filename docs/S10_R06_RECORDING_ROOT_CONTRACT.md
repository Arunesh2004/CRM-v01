# S10 R06 Recording Root Contract

## 1. Original Blocker
R06 was originally blocked because there was no authoritative filesystem-root contract for CCTV recordings. The daemon received paths blindly from the webhook, tests hardcoded `/tmp`, and provisioning hardcoded `/var/lib/mediamtx/recordings`. Without a unified contract, R06 path validation could not safely enforce a trusted root boundary without inventing an unsafe environment-specific default.

## 2. Evidence
- Webhook accepted untrusted absolute paths.
- Provisioning in `stream.service.ts` statically embedded `/var/lib/mediamtx/recordings`.
- `vitest.config.ts` did not provide a configuration contract for recording paths.
- Test implementations such as `cctv-ingestion-daemon.test.ts` and `cctv-s11-chaos.test.ts` manually composed paths in `/tmp`.
- Docker configuration (`docker-compose.yml`) lacked MediaMTX entirely and had no volume definitions mapping the worker to a recording root.

## 3. Configuration Contract
A strict server-only configuration contract was established via the environment variable `CCTV_RECORDINGS_ROOT`. It fails closed if empty when CCTV is enabled. All components (Provisioning, Webhook, Tests) now align on this single authoritative source.

## 4. Configuration Source
The authoritative source is defined in `src/lib/config/env.ts` as `ENV.cctvRecordingsRoot`. It mandates the presence of `process.env.CCTV_RECORDINGS_ROOT` and trims the result, avoiding any implicit test vs. production fallback logic natively within the application code.

## 5. Test Configuration
An explicit test configuration override was established inside `vitest.config.ts`, resolving `CCTV_RECORDINGS_ROOT` to the system's temporary directory (`os.tmpdir()`) if not already defined. Existing tests were updated to derive their local file paths from `ENV.cctvRecordingsRoot` rather than hardcoding `/tmp`.

## 6. MediaMTX Provisioning Relationship
`stream.service.ts` was updated. `recordPath` is now dynamically provisioned using the configured root: `${ENV.cctvRecordingsRoot}/%path/%Y-%m-%d_%H-%M-%S.mp4`. It no longer harbors a secondary, independent path constant.

## 7. Worker Filesystem Relationship
The daemon continues to fetch `localFilePath` from the job record. Because the Webhook now strictly verifies that incoming payload paths sit beneath `ENV.cctvRecordingsRoot`, the pipeline asserts a shared path expectation.

## 8. Docker/Infrastructure Dependency
Since MediaMTX and the CRM Worker operate as separate containers/processes, the eventual Production deployment MUST explicitly mount a shared filesystem volume that effectively maps the exact path defined in `CCTV_RECORDINGS_ROOT` into BOTH environments (MediaMTX and CRM worker).

## 9. Security Boundary
The security boundary is strictly `ENV.cctvRecordingsRoot`. It is no longer an inferred or environment-switched string. The configuration relies completely on the runtime environment administrator enforcing the deployment contract.

## 10. What Remains for R06
The ingestion daemon (`src/workers/cctv-ingestion-daemon.ts`) does not yet perform its own robust validation of `job.localFilePath`. The daemon still needs to:
- Resolve the absolute path (handling symlinks via `realpath`).
- Enforce that the fully resolved path begins with the exact authoritative root.
- Verify containment strictly.

## 11. Production Requirements
Production deployment scripts/manifests must now actively export `CCTV_RECORDINGS_ROOT` (e.g., `/var/lib/mediamtx/recordings`) and correctly map the storage volume for the worker and MediaMTX to safely interoperate.
