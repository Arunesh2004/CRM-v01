# PHASE 7.2 MODULE UI INVENTORY

## 1. Dashboard (`/dashboard`)
- **Current UI**: Modern metrics grid and Recharts-powered regional sales trend chart.
- **Current Functionality**: KPI cards for Customers, Leads, Tasks, Est. Pipeline. Real-time Activity Timeline.
- **Available Actions**: Navigation to other modules.
- **Missing UX Improvements**: Data dense, but could use hover animations and interactive chart tooltips. Needs integration with the deep navy/saffron Indian SaaS theme beyond basic Tailwind classes.

## 2. Customers (`/customers`)
- **Current UI**: Standard enterprise table layout.
- **Current Functionality**: Displays customer name, industry, and status.
- **Available Actions**: View customer details (`/customers/[id]`), inline status badge.
- **Missing UX Improvements**: Needs a modern split-pane or detail-view pattern for large data. The "Filter" and "Sort" buttons were removed due to missing backend logic; we need functional UI elements or a better presentation layer (e.g. data density toggles, column visibility) that doesn't rely on missing backend APIs. Needs an advanced profile view.

## 3. Leads (`/leads`)
- **Current UI**: Kanban pipeline board.
- **Current Functionality**: Draggable (visually) cards in status columns (NEW, CONTACTED, etc.).
- **Available Actions**: Update status, add new lead.
- **Missing UX Improvements**: Kanban drag-and-drop must be fully interactive if backend supports it, or clearly structured if not. Cards need more hierarchy (value, company, owner avatar).

## 4. Tasks (`/tasks`)
- **Current UI**: List view of tasks separated into "Open Tasks".
- **Current Functionality**: Checks due dates and assigns `isOverdue` or `isToday` statuses. Displays employee assignment.
- **Available Actions**: Edit (placeholder).
- **Missing UX Improvements**: Lacks Kanban or Calendar view. Status updates should be actionable directly from the list.

## 5. Communication (`/communications`)
- **Current UI**: Primitive list mapping via `CommunicationHistoryTable`.
- **Current Functionality**: Fetches basic notifications/logs.
- **Available Actions**: None visible.
- **Missing UX Improvements**: Needs an enterprise messaging interface (Slack/Teams style) with a conversation list, message timeline, and contact context panel, preparing for WhatsApp/Email/Call integrations.

## 6. Incidents/CCTV (`/incidents`)
- **Current UI**: Primitive `IncidentClientTable`.
- **Current Functionality**: Fetches incidents.
- **Available Actions**: None visible.
- **Missing UX Improvements**: Needs a Security Operations Center (SOC) dashboard. Real-time timeline, evidence area (placeholder), and camera grid layout.

## 7. Reports (`/reports`)
- **Current UI**: Basic cards for Security, Camera, CRM, and Communication metrics.
- **Current Functionality**: Fetches `getDashboardMetricsAction` and displays simple components.
- **Available Actions**: Date filtering, Export (if functional).
- **Missing UX Improvements**: Needs high-quality analytics presentation (Recharts). Empty states for missing data. 

## 8. Settings (`/admin`)
- **Current UI**: Basic 2-column grid showing Company Information and Security Status.
- **Current Functionality**: Displays Tenant ID, name, hardcoded timezone, and security configurations.
- **Available Actions**: "Edit Profile" (placeholder).
- **Missing UX Improvements**: Needs a scalable tabbed navigation (Company Profile, Employees, Roles, Integrations, Security, Billing).
