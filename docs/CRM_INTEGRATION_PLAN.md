# CRM Frontend-Backend Integration Plan

## Current State
- **Backend**: The CRM module's backend is fully implemented. Prisma models exist for `Lead`, `Customer`, `Task`, and `ActivityTimeline`. Services (`lead.service.ts`, `customer.service.ts`) and Server Actions are functional, secure, and enforce tenant isolation via `withTenant(tenantId)`.
- **Frontend**: The CRM UI routes (`/leads`, `/customers`, `/dashboard`) are currently rendering hardcoded UI mocks (e.g., static Kanban columns, static tables, static KPI numbers). No data is being fetched, and the "Add" buttons have no functionality.
- **Activity Tracking**: Backend services currently create `AuditLog` records for actions, but do not yet create `ActivityTimeline` records intended for the customer/lead timeline views.

## Files Involved
- `src/app/(crm)/leads/page.tsx`
- `src/app/(crm)/customers/page.tsx`
- `src/app/(crm)/dashboard/page.tsx`
- `src/modules/crm/lead/lead.service.ts`
- `src/modules/crm/customer/customer.service.ts`
- (New) `src/components/crm/LeadForm.tsx` (Client component for New Lead modal)
- (New) `src/components/crm/CustomerForm.tsx` (Client component for New Customer modal)
- (New) `src/components/crm/StatusUpdater.tsx` (Client component for moving leads)

## Required Changes

### 1. Lead Management
- **Read**: Update `leads/page.tsx` to a Server Component that fetches data via `getLeadsAction()`. Map the returned leads into their respective Kanban columns (`NEW`, `CONTACTED`, `QUALIFIED`, `CONVERTED`, `LOST`).
- **Create**: Implement a client-side modal form (`LeadForm.tsx`) attached to the "New Lead" button. This will capture input, call `createLeadAction()`, and trigger a router refresh.
- **Update**: Add simple interactive buttons or dropdowns to each Kanban card to allow changing the status via `updateLeadAction()`.
- **Empty States**: Render "No leads found" gracefully if the list is empty.

### 2. Customer Management
- **Read**: Update `customers/page.tsx` to fetch data via `getCustomersAction()`. Map the data into the existing table structure.
- **Create**: Implement a client-side modal form (`CustomerForm.tsx`) for the "Add Customer" button.
- **Update/Delete**: Ensure basic update hooks are in place.
- **Empty States**: Render "No customers found" if the table is empty.

### 3. Dashboard
- **KPIs**: Fetch real counts for Customers, Active Leads, and Pending Tasks directly from Prisma for the current `tenantId` and replace the static KPI cards.
- **Recent Activities**: Fetch recent `ActivityTimeline` entries to populate the feed.

### 4. Activity / Timeline Integration
- **Backend Update**: Modify `lead.service.ts` and `customer.service.ts` to insert records into the `ActivityTimeline` table (in addition to `AuditLog`) whenever a lead or customer is created or updated, ensuring the timeline reflects real user actions.

### 5. Security Requirements
- All Server Actions already use `requireAuth()` and `requireTenant()`, preventing cross-tenant access. No tenant ID will ever be passed from the client payload.

## Risks & Mitigation
- **Client/Server Component Boundaries**: Mixing interactive forms (Client) with data fetching (Server) in Next.js requires careful separation. Forms will be isolated into dedicated Client Components (`"use client"`) while pages remain Server Components.
- **State Strikethrough**: To ensure the UI updates instantly after an action, we will use `useRouter().refresh()` rather than building complex client-side state management. This preserves the existing architecture.
