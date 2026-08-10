# Phase R.11 Enterprise Product Completion Plan

## 1. Current State
The application possesses a robust, enterprise-grade backend built with Prisma, Clerk, and Next.js Server Actions. Phase R.9 elevated the UI/UX foundation by introducing proper loading boundaries (`loading.tsx`), optimistic UI interactions, global toast notifications (`sonner`), and modernized data-fetching strategies. However, the frontend is currently a "Thin UI" that does not expose the full capabilities of the backend. Specifically, advanced data entry (Kanban DND), global search, audit trails, and complex analytics remain largely unimplemented or mock-driven.

## 2. Gap Analysis
*   **Search**: No global search exists, forcing users to click through multiple pages to find a record.
*   **Analytics**: The dashboard charts are hardcoded and lack date-range context, rendering them useless for real business metrics.
*   **Lead Management**: The Kanban board requires manual dropdown clicks rather than intuitive drag-and-drop.
*   **Productivity**: Users cannot quickly create tasks/leads without navigating to specific pages.
*   **Security/Audit**: The database logs all tenant activities via `AuditLog`, but Tenant Admins have no UI to view these trails.
*   **Billing**: The infrastructure for Stripe webhooks and providers is in place, but checkout sessions are not connected to the UI.

## 3. Architecture Changes
*   **Search Service Layer**: Introduction of `src/modules/search/search.service.ts` to aggregate cross-model queries (Customers, Leads, Tasks, Employees). This abstracts Prisma `OR` searches and prepares the system for future Elasticsearch/Algolia integration.
*   **Analytics Service Layer**: Introduction of `src/modules/analytics/analytics.service.ts` for handling complex Prisma aggregations, date-math filtering, and group-by logic to feed the Dashboard.
*   **Global Layout Context**: Addition of a `<CommandPalette>` and `<QuickAddMenu>` within the main `layout.tsx` to provide universal access.
*   **Drag-and-Drop Infrastructure**: Integration of `@dnd-kit/core` on the client side, synchronizing state with Server Actions.

## 4. File Changes

### New Files:
*   `src/modules/search/search.service.ts`
*   `src/modules/search/actions/search.actions.ts`
*   `src/components/ui/CommandPalette.tsx`
*   `src/components/ui/QuickAddMenu.tsx`
*   `src/modules/analytics/analytics.service.ts`
*   `src/app/(crm)/settings/audit/page.tsx`
*   `src/app/(crm)/settings/audit/loading.tsx`
*   `src/components/crm/KanbanBoard.tsx` (Migrated from Leads page)

### Modified Files:
*   `src/app/(crm)/dashboard/page.tsx` (Replace static chart with real Analytics payload)
*   `src/app/(crm)/layout.tsx` (Inject QuickAdd and CommandPalette)
*   `src/app/(crm)/leads/page.tsx` (Implement `KanbanBoard` with `dnd-kit`)
*   `src/app/(crm)/settings/employees/page.tsx` (Add Role modification UI)
*   `src/app/(crm)/settings/billing/page.tsx` (Wire Stripe Checkout Session actions)
*   `src/modules/crm/actions/lead.actions.ts` (Ensure Status updates trigger `ActivityTimeline` and push notifications)

## 5. Implementation Order

### Milestone 1: Global Search & Quick Actions
1.  Implement `search.service.ts` (Prisma queries for global search).
2.  Build `<CommandPalette>` and integrate `cmdk` for `ctrl+k` access.
3.  Build `<QuickAddMenu>` in the layout header to instantly trigger forms (Create Lead, Task, Customer).

### Milestone 2: Real Analytics & Dashboard
1.  Implement `analytics.service.ts` for time-series aggregation.
2.  Update `/dashboard` to accept `?range=30d` queries.
3.  Replace the static chart with `Recharts` hooked to live data.

### Milestone 3: Lead Workflow (Kanban)
1.  Install `@dnd-kit/core`, `@dnd-kit/sortable`.
2.  Refactor `/leads` into a strictly controlled Client Component for DND state management.
3.  Implement Server Action callbacks on drop, generating `ActivityTimeline` entries.

### Milestone 4: Enterprise Administration & CRM Polish
1.  Build `/settings/audit` page to query and display the `AuditLog` table.
2.  Update `/settings/employees` to allow role promotion/demotion.
3.  Enhance Customer Profile to include UI for creating Contacts and Locations.

### Milestone 5: Billing & Monetization
1.  Create `createCheckoutSessionAction` in billing module.
2.  Wire the "Upgrade Plan" buttons on `/settings/billing` to trigger checkout.
3.  Verify Stripe webhook handlers correctly update `Tenant.status` and `Subscription`.

## 6. Risk Analysis
*   **Search Performance**: Wildcard ILIKE searches in Postgres across multiple large tables can be slow. *Mitigation: Limit search results to Top 5 per entity type. Future-proof service layer for Elasticsearch.*
*   **Kanban State Mismatches**: Optimistic UI in drag-and-drop can drift if the server action fails. *Mitigation: Enforce strict rollback logic using `dnd-kit`'s sensor cancellation and toast errors if the DB fails.*
*   **Analytics Load**: Real-time aggregation of thousands of events can bottleneck the DB. *Mitigation: Since it's a B2B SaaS, data volumes per tenant are manageable initially. Ensure `tenantId` is indexed alongside `createdAt`.*

## 7. Verification Strategy
1.  **Global Search**: Ensure pressing `Ctrl+K` opens the palette anywhere, and searching a known customer email returns a clickable link to their profile.
2.  **Dashboard**: Create a lead, convert it, and verify the conversion rate/sales chart immediately updates.
3.  **Kanban**: Drag a lead from "NEW" to "CONTACTED" and verify the DB updates, a toast fires, and an Activity Timeline entry appears on the lead/customer profile.
4.  **Audit Logs**: Change a setting, then navigate to `/settings/audit` and verify the action was logged chronologically with the correct User ID.
5.  **Billing**: Run Stripe CLI locally (`stripe listen --forward-to`) to mock a successful payment and ensure the UI unlocks premium features.
