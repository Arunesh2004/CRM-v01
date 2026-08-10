# PHASE 7.2.5 INCIDENT BEFORE AUDIT

## 1. Existing Functionality
- The Incidents page (`/incidents`) uses `getIncidentsAction()` to fetch incidents.
- It relies on `IncidentClientTable.tsx` to render the incidents.
- Existing actions available:
  - `updateIncidentStatusAction` (Investigate)
  - `resolveIncidentAction` (Resolve)
  - `deleteIncidentAction` (Delete)
- Renders `IncidentNotificationStatus` component.

## 2. Existing Fields & Available Data
From Prisma schema `Incident`:
- `title`
- `description`
- `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `status` (`OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`)
- `createdAt`, `resolvedAt`
- Relations: `location` (`name`), `camera` (`name`), `assignedUser`, `aiEvent`.

## 3. UI Limitations
- Currently uses a primitive HTML table layout.
- Actions are basic buttons (`Investigate`, `Resolve`, `Delete`).
- Lacks a dashboard/SOC view. No overarching metrics. No side panels.
- Does not visualize camera integrations effectively beyond just the name of the camera.
- Lacks a timeline view for events.

## 4. Missing Capabilities
- No real-time live feeds or video players.
- No historical timeline of incident updates.
- No aggregated stats endpoints (must compute them client-side or during server-render if possible using the loaded `incidents` array).

We will rewrite `IncidentClientTable` to adopt a SOC dashboard layout (Command Bar, Left Panel: Incident Queue, Center Panel: Workspace, Right Panel: Security Context) as specified in Phase 7.2.5 rules.
