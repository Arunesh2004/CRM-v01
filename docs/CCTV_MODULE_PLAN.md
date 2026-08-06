# CCTV Module Plan

## Existing Architecture
- **Prisma Schema**: The database already contains comprehensive models for `Camera`, `CameraCredential`, `CameraStream`, `CameraEvent`, and `AIEvent`. 
- **Relations**: Cameras are linked to physical `Location`s. They belong to a `Tenant` with cascading deletes. 
- **Storage/Providers**: A provider factory architecture exists for Email, SMS, and Payments. The CCTV component currently has no provider abstraction.
- **Activity Feed**: CRM operations successfully pipe into `ActivityTimeline`.

## Missing Components
1. **Provider Abstraction**: We need a `CameraProvider` interface to standardise interaction with video feeds and hardware, alongside a concrete `MockCameraProvider` for demo purposes.
2. **Backend Service**: `src/modules/cctv/camera.service.ts` for camera CRUD operations and AI event generation.
3. **Server Actions**: Secure wrappers for the camera service, ensuring `tenantId` is isolated.
4. **UI**: `/cameras` (Camera Management) and `/monitoring` (Camera Dashboard) pages.

## Demo Approach
Since true RTSP video streaming and ML inferencing are out of scope for the demo module:
- The system will use a `MockCameraProvider` that simulates camera statuses (ONLINE/OFFLINE) and provides static placeholder video feeds or metadata.
- An **AI Event Simulator** will programmatically insert fake `AIEvent` records (e.g., "Person detected") when triggered, which will then surface in the `ActivityTimeline` to demonstrate the security incident flow to clients.

## Production Migration Path
1. **Provider Hot-Swap**: The `MockCameraProvider` will later be replaced by an `RTSPCameraProvider` (e.g., using WebRTC or HLS transcoders) via the `ProviderFactory`.
2. **Real Computer Vision**: The AI event generator will be replaced by a dedicated microservice (or webhook receiver) that ingests real bounding box data from computer vision models and writes to the existing `AIEvent` table.
3. **Video Storage**: A future `StorageProvider` (e.g., AWS S3) will be integrated to handle the `Recording` model.
