# Incident Module Audit

## 1. Files Changed/Created
- **Database schema**: 
  - `database/schema.prisma` (Added `IncidentStatus`, `IncidentSeverity`, `Incident` model and corresponding relations).
- **Backend Services**:
  - `src/modules/incident/incident.types.ts`
  - `src/modules/incident/incident.service.ts`
  - `src/modules/cctv/camera.service.ts` (Updated to auto-create incidents based on AI event detection mapped severity).
- **Validation & Server Actions**:
  - `src/modules/incident/validators/incident.schema.ts`
  - `src/modules/incident/actions/incident.actions.ts`
- **Frontend UI**:
  - `src/components/incident/IncidentClientTable.tsx`
  - `src/app/(crm)/incidents/page.tsx`
  - `src/components/cctv/CameraStreamCard.tsx` (Updated to reflect Incident creation).

## 2. Incident Workflow
1. **Event Trigger**: When a user clicks "Simulate AI Event" on the monitoring dashboard, it creates an `AIEvent`.
2. **Severity Mapping**: The `camera.service` evaluates the detected object:
   - "Person detected" -> HIGH
   - "Vehicle detected" -> MEDIUM
   - "Restricted area intrusion" -> CRITICAL
   - Other -> LOW
3. **Incident Generation**: An `Incident` record is securely spawned with `status: OPEN`, linking the Camera, Location, AI Event, and Tenant.
4. **Activity Timeline**: A visible alert is added to the tenant's `ActivityTimeline`.
5. **Resolution**: The Incident appears on the `/incidents` dashboard, where staff can "Investigate" (moving it to `INVESTIGATING`) or "Resolve" (closing the incident and recording a resolution timestamp).

## 3. Demo Capability
**Working Today:**
- ✅ AI Event spawning a correctly-mapped Severity Incident.
- ✅ Live UI alert showing Incident creation.
- ✅ `/incidents` dashboard detailing all open, investigating, and resolved alerts.
- ✅ Workflow actions: Investigate, Resolve.
- ✅ Complete Tenant isolation.

**Not Production Yet:**
- ⏳ Real AI detection (YOLO, etc.).
- ⏳ Automatic emergency response triggers (e.g. calling police API).
- ⏳ External alert integrations (e.g. Twilio SMS, PagerDuty).

## 4. Production Upgrade Path
**From Mock AI Event ➡️ Computer Vision Pipeline**
The system architecture will not require any code rewrite within the `incident.service.ts` module. A future webhook handler ingesting payloads from physical computer vision models will simply invoke `createIncident()` exactly as the mock simulator does today.

## 5. Security Results
- **Tenant Validation**: The `withTenant()` Prisma extension guarantees that Tenant A cannot query, update, or assign incidents belonging to Tenant B.
- **Client Security**: `requireTenant()` is enforced at the server action layer, meaning the client never passes the `tenantId` in payloads, preventing ID spoofing.

## 6. Build Result
- **Status**: PASS
- **TypeScript Errors**: 0
- The application dynamically compiles the new `/incidents` route successfully.
