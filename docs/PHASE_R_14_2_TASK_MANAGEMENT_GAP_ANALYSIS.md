# Phase R.14.2 Task Management Gap Analysis

This document serves as an audit of the current Task Management system in the CRM, identifying the gaps between the current implementation and a fully-featured enterprise workspace.

## 1. Current Task Module Audit

### Task Prisma Model
- **Existing**: `id`, `tenantId`, `title`, `description`, `dueDate`, `status` (PENDING, IN_PROGRESS, COMPLETED), `assignedUserId`, `leadId`, `customerId`.
- **Missing**: `priority` (LOW, MEDIUM, HIGH, URGENT).
- **Missing**: Comments (No `TaskComment` model exists).

### Task Services & Actions
- **Existing**: Basic CRUD operations (`createTask`, `updateTask`, `getTasks`).
- **Missing**: Complex filtering, workload aggregations for managers, overdue detection algorithms.

### Task UI
- **Existing**: Simple list view in `/tasks`.
- **Missing**: Calendar view, advanced filtering, full detail workspace (`/tasks/[id]`), inline status updates.

### Relationships & Notifications
- **Existing**: Linked to `Customer` and `Lead`. Activity timeline logging is basic.
- **Missing**: Automated notification events when tasks are assigned or overdue.

---

## 2. Gap Identification & Focus Areas

### List View
- **Status**: `DEMO / REQUIRES ENHANCEMENTS`
- **Gap**: Needs proper filters (Status, Priority, Assignee, Due Date, Customer, Lead) and robust cursor-based pagination.

### Calendar View
- **Status**: `NOT IMPLEMENTED`
- **Gap**: Users need a visual representation of their daily workload. Must build a Day/Week/Month calendar component reading from Prisma dates.

### Task Detail Workspace (`/tasks/[id]`)
- **Status**: `NOT IMPLEMENTED`
- **Gap**: Requires a dedicated view showing full task context, related entities, and chronological activity history (using `ActivityTimeline`).

### Task Priority System
- **Status**: `NOT IMPLEMENTED` (Requires DB Schema update)
- **Gap**: Must introduce a new ENUM `TaskPriority` and migrate existing tasks.

### Task Comments
- **Status**: `NOT IMPLEMENTED` (Requires DB Schema update)
- **Gap**: Must create `TaskComment` model linked to `Task` to keep context-specific discussions out of the global chat.

### Due Date Intelligence
- **Status**: `DEMO`
- **Gap**: UI needs visual indicators for "Overdue", "Due Today", and "Upcoming" based on real-time date comparisons.

### Employee Workload View (`/tasks/workload`)
- **Status**: `NOT IMPLEMENTED`
- **Gap**: Managers need aggregated statistics (Active tasks, Overdue, Completed) via efficient grouped Prisma queries.

### Performance
- **Status**: `REQUIRES ENHANCEMENTS`
- **Gap**: The current simple query will stall on large datasets (100k+ tasks). Needs strict pagination and indexes on `dueDate` and `priority`.

---

## 3. Implementation Roadmap

1. **Database Schema Update**: Add `TaskPriority` Enum to `Task`. Create `TaskComment` model. Create indexes on `dueDate` and `priority`.
2. **Service Layer**: Expand `getTasks` to support priority and advanced filters. Create `getTaskWorkloadMetrics`. Update `createTask`/`updateTask` to handle priority.
3. **UI - Detail Workspace**: Build `/tasks/[id]` with activity history and comment section.
4. **UI - List & Calendar**: Upgrade `/tasks` to include robust filters and toggle between List and Calendar views.
5. **UI - Workload**: Build `/tasks/workload` dashboard for managers.
6. **Performance Script**: Build and run benchmark against 100,000 tasks.

This completes the R.14.2 Audit. Awaiting approval to proceed with the implementation plan.
