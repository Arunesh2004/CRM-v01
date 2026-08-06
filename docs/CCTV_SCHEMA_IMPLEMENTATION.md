# CCTV Database Schema Implementation

## Overview
Phase 6.1 successfully initialized the fundamental database schema for the CCTV Module. The changes were strictly applied to `database/schema.prisma` natively, establishing the necessary architectural foundation without enforcing disruptive migrations or leaking application logic.

## Models Created
1. **`Camera`**: Core entity anchoring physical device metadata (`ipAddress`, `protocol`, `manufacturer`). Extends directly from `Tenant` and optionally references `Location`.
2. **`CameraCredential`**: Dedicated table structurally isolated from the core camera record, designed specifically for secure credential masking.
3. **`CameraStream`**: Tracking table mapping active video feed bindings.
4. **`Recording`**: Storage ledger denoting raw file locations and timestamp boundaries for DVR-style features.
5. **`CameraEvent`**: System log explicitly tracking hardware lifecycles (`CONNECT`, `DISCONNECT`, `MOTION`).
6. **`AIEvent`**: High-frequency Inference mapping table logging bounding-box data, timestamps, and model confidence scores from Python inference servers.

## Relations
The SaaS multi-tenancy model was preserved strictly:
- `Tenant` was extended to naturally cascade-delete `Camera`, `CameraCredential`, `CameraStream`, `Recording`, `CameraEvent`, and `AIEvent`. 
- Data immutability and cascading deletion were implemented intelligently (e.g., dropping a camera purges its stream URLs, events, and credentials atomically).
- `Location` is now bound to multiple `Cameras`.

## Security Decisions
- **No Plaintext Credential Exposure**: Added `encryptedUsername` and `encryptedPassword` instead of basic string arrays. The schema ensures we expect ciphertexts for these sensitive ONVIF/RTSP payloads natively.
- **Resource Verbs**: Expanded `Resource` enum to map `STREAM`, `RECORDING`, and `AI_EVENT` specifically so that Clerk RBAC roles can differentiate between a "Viewer" and a "Hardware Installer." (`CAMERA` already existed and was repurposed appropriately).
- **Index Guarding**: Saturated the indexes natively anchoring all queries to `[tenantId, cameraId]` to structurally prevent cross-tenant leakages during mass aggregation queries.

## Validation Result
Running `npx prisma validate` confirms structurally perfect syntax and relationships across the entire database configuration:
> `The schema at database\schema.prisma is valid 🚀`
