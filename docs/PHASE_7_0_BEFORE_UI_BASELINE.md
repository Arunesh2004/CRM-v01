# PHASE 7.0 BEFORE UI BASELINE

## Global Shell & Routes
- `layout.tsx`: Sidebar (`/dashboard`, `/customers`, `/leads`, `/tasks`), Header (Workspace, User Menu). Working but primitive UI.

## Pages & Data Features
- **Dashboard (`/dashboard`)**:
  - Displays KPIs: Customer Count, Leads Count, Tasks Count, Revenue ($0 hardcoded).
  - Activity Timeline: Uses `Suspense` and maps `prisma.activityTimeline`.
  - Tasks: Basic suspense placeholder.
- **Customers (`/customers`)**:
  - Fetches and displays list of customers. (Expected basic table)
- **Leads (`/leads`)**:
  - Fetches and displays list of leads. (Expected basic table)
- **Tasks (`/tasks`)**:
  - Fetches and displays list of tasks. (Expected basic table)

## Protection Requirements
Every Prisma query, `$transaction`, `requireAuth()`, `requireTenant()`, and `Suspense` data-loading boundary must remain entirely intact. The CSS classes and DOM nodes will be reshaped around the identical data fetching mechanics.
