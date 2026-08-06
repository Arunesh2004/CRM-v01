# Location Module & Customer Infrastructure Plan

## Current Architecture
- The `Location` Prisma model exists and is related to `Tenant` and `Customer`.
- The `Location` model also supports relations to `Camera` (`cameras Camera[]`), meaning it is structurally prepared for the CCTV module.
- The `Customer` model has a one-to-many relationship with `Location`.
- **Missing Pieces**:
  - `src/modules/crm/location/location.service.ts` for database operations.
  - `src/modules/crm/actions/location.actions.ts` for Server Actions.
  - `src/modules/crm/validators/location.schema.ts` for input validation.
  - `src/app/(crm)/locations` UI routes for listing and managing locations.
  - Integration of Locations into the Customer details view.

## Files to Modify/Create
1. **Types & Validators**:
   - `src/modules/crm/crm.types.ts`: Add `CreateLocationInput` and `UpdateLocationInput`.
   - `src/modules/crm/validators/location.schema.ts`: Create Zod schemas.
2. **Backend**:
   - `src/modules/crm/location/location.service.ts`: Create CRUD operations (`createLocation`, `getLocations`, `updateLocation`, `deleteLocation`).
   - `src/modules/crm/actions/location.actions.ts`: Create secure Server Actions wrapping the service layer.
3. **Frontend UI**:
   - `src/app/(crm)/locations/page.tsx`: New Server Component to list locations.
   - `src/components/crm/LocationForm.tsx`: New Client Component modal to create/edit locations.
   - `src/app/(crm)/customers/[id]/page.tsx`: Enhance the customer details page (if it exists, or create it) to show related locations, contacts, and timeline.

## Security Considerations
- **Authentication**: All new Server Actions will invoke `await requireAuth()`.
- **Tenant Isolation**: `withTenant(tenantId)` will be used in `location.service.ts`. The client will never pass `tenantId` in payloads.
- **Cascading Deletes**: The Prisma schema already defines `onDelete: Cascade` for the Tenant and Customer relationships, ensuring data consistency if a customer is removed.

## CCTV Preparedness
- The location architecture will expose the `id` and `name` which the future CCTV module will use to assign cameras to physical locations. No camera models will be modified in this phase.
