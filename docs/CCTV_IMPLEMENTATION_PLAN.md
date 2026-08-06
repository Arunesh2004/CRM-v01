# CCTV Module Architecture Plan

## 1. CCTV Module Scope

The AI Security CRM SaaS platform requires a robust CCTV integration module supporting:

- **Camera Management**: Support for IP cameras, RTSP streams, ONVIF discovery, and NVR/DVR integration. Managing device credentials, tracking health/status, and mapping to tenant locations.
- **Streaming**: A unified abstraction layer bridging RTSP ingestion, WebRTC delivery, live previews, and secure stream session handling.
- **Recording**: Policies governing continuous recording, event-based recording, storage lifecycles, and retention limits.
- **AI Integration**: Bridging camera feeds with inference workers for motion, person, intrusion, and anomaly detection.
- **Events**: Centralized logging for Camera Events (e.g., offline/online), AI Events, User Notifications, and pushing critical events into the `ActivityTimeline`.

## 2. Database Design Proposal

### Camera
- `id`: String @id
- `tenantId`: String
- `locationId`: String?
- `name`: String
- `model`: String?
- `manufacturer`: String?
- `ipAddress`: String
- `protocol`: Enum (RTSP, ONVIF)
- `status`: Enum (ONLINE, OFFLINE, MAINTENANCE)
- `lastHeartbeat`: DateTime?

### CameraCredential
- `cameraId`: String @unique
- `encryptedUsername`: String
- `encryptedPassword`: String

### CameraStream
- `cameraId`: String @unique
- `streamUrl`: String
- `protocol`: String
- `status`: Enum (ACTIVE, INACTIVE)

### Recording
- `id`: String @id
- `cameraId`: String
- `storageKey`: String
- `startTime`: DateTime
- `endTime`: DateTime?
- `size`: Int?

### CameraEvent
- `id`: String @id
- `cameraId`: String
- `eventType`: Enum (CONNECT, DISCONNECT, REBOOT)
- `severity`: Enum (INFO, WARNING, CRITICAL)
- `timestamp`: DateTime
- `metadata`: Json?

### AIEvent
- `id`: String @id
- `cameraId`: String
- `model`: String (e.g., 'YOLOv8-Person')
- `confidence`: Float
- `detectedObject`: String
- `timestamp`: DateTime

## 3. Security Architecture

- **Encrypted Credentials**: Camera passwords (`encryptedPassword`) must be symmetrically encrypted at rest using a master key injected via server environment variables. The API will never expose raw credentials.
- **Tenant Isolation**: Every `Camera` and associated event binds permanently to `tenantId`. Cross-tenant video bleeding is cryptographically prevented at the Prisma layer.
- **Signed Stream URLs**: WebRTC/HLS endpoints will issue temporary, signed tokens per user session instead of relying on persistent static URLs.
- **RBAC Permissions**: The `Resource` enum will be expanded to support CCTV.
  - `CAMERA:CREATE`, `CAMERA:READ`, `CAMERA:UPDATE`, `CAMERA:DELETE`
  - `STREAM:VIEW`
  - `RECORDING:VIEW`

## 4. Provider Abstraction

```typescript
// src/lib/providers/cctv/camera-provider.interface.ts

export interface CameraProvider {
  registerCamera(ip: string, credentials: any): Promise<boolean>;
  getStatus(cameraId: string): Promise<string>;
  getStream(cameraId: string): Promise<string>;
  getRecording(cameraId: string, start: Date, end: Date): Promise<string[]>;
}
```

Future providers to be implemented via Factory injection:
- `OnvifProvider`
- `HikvisionProvider`
- `DahuaProvider`
- `AxisProvider`

## 5. Scaling Considerations

- **Background Workers**: Node.js/Redis worker pools strictly handling heartbeat jobs and retries for unresponsive IPs.
- **Stream Servers**: Decoupled media servers (e.g., Mediamtx or Kurento) that handle trans-muxing RTSP into WebRTC to prevent blocking the Next.js API layer.
- **Object Storage**: S3-compatible blobstores for tiered recording lifecycles.
- **AI Inference Workers**: Isolated Python/GPU worker clusters pulling frames via internal stream proxies to run YOLO/CV models.

## 6. Testing Strategy

Future test suites will verify:
- **Tenant Isolation**: Attempting to fetch streams belonging to another tenant ID explicitly fails.
- **Credential Encryption**: Verifying that the database never persists raw text credentials for ONVIF syncs.
- **Stream Authorization**: Pre-signed URLs correctly expire and enforce viewing bounds.
- **Event Processing**: Testing the message queue behavior for simulated AI and heartbeat events.
