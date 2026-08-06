# Incident Module Plan

## Existing Architecture
- **Prisma Schema**: `Camera`, `Location`, and `AIEvent` models are in place. The CRM module includes a full `ActivityTimeline` architecture for tracking system events.
- **Security Infrastructure**: Solid `withTenant()` boundaries and standard `requireAuth()` server actions are available.
- **Incident Model**: Missing. An `Incident` model does not currently exist in `schema.prisma`.

## Missing Pieces
- `Incident` Prisma model, along with its statuses (`IncidentStatus`) and severities (`IncidentSeverity`).
- `src/modules/incident/incident.service.ts` for database CRUD logic and linking `AIEvent`s to new Incidents.
- Server actions to securely invoke the service.
- The `/incidents` UI dashboard to triage and manage these security alerts.
- Tying the mock AI event simulation to automatically spawn these Incidents.

## Incident Workflow Design
1. **Detection**: `simulateAIEvent()` generates an `AIEvent`.
2. **Alert Generation**: The service captures this `AIEvent` and spawns a new `Incident` record (e.g., "Unauthorized Person Detected") setting its severity to HIGH and status to OPEN.
3. **Notification**: The Incident emits an `ActivityTimeline` event for visibility on the customer dashboard.
4. **Resolution**: Security teams view the `/incidents` dashboard, assign users, investigate, and mark the Incident as RESOLVED.

## Production Migration Path
This workflow represents the exact logic path used in production.
- Today: `MockCameraProvider` -> `simulateAIEvent()` -> Incident Creation.
- Future: `Computer Vision Server` -> `Webhook Provider` -> Incident Creation.
The UI and Incident management layer will not need to change when real computer vision models are plugged in.
