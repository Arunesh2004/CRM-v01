# Phase R.10: Enterprise Product Gap Analysis

## 1. Executive Summary
This document serves as a comprehensive Product Design and UX Audit of the AI-Security-CRM-SaaS platform, benchmarking it against tier-1 CRM standards such as Salesforce, HubSpot, and Zoho CRM. While Phase R.9 successfully modernized the frontend foundation (toast notifications, skeletons, form states), this audit evaluates the depth of the CRM features, the reality of the UI, and the workflows required to support a true enterprise sales and operations team.

### Product Maturity Score: 7.0 / 10
The platform has an exceptionally strong, production-grade backend (multi-tenancy, RBAC, Webhooks, robust DB schema). However, the frontend remains a "Thin UI" over a "Thick Backend." Many advanced backend capabilities (Audit Logs, Calendar, Reporting) are not yet exposed to the user.

### Remaining Gap vs. Salesforce/HubSpot
Approximately 2-3 sprints of frontend workflow wiring. The primary gaps are data visualization (analytics), workflow automation visibility, and advanced data-entry mechanisms (drag-and-drop, global search).

---

## 2. Route-by-Route Gap Analysis

### 2.1 Dashboard (`/dashboard`)
*   **[HIGH] Fake UI:** The `SalesChart` component is rendering static data. It does not reflect actual lead conversions or invoice amounts.
*   **[MEDIUM] Missing Feature:** No date-range filters (e.g., "Last 30 Days", "This Quarter"). The metrics are currently all-time totals, which is useless for a sales team.
*   **[LOW] Navigation:** Clicking on the metrics cards (e.g., "Active Leads") does not link to the filtered `/leads` page.

### 2.2 Global Navigation & Search (`/layout`)
*   **[CRITICAL] Fake UI:** The Global Search bar in the top navigation is completely inactive.
*   **[HIGH] Missing Feature:** Missing a "Global Quick Add" button (`+`). Enterprise users expect to be able to log a call or create a task from anywhere in the app without navigating away.
*   **[MEDIUM] Real-Time:** The Notification Bell requires a hard refresh to show new alerts; it lacks a WebSocket/Polling connection.

### 2.3 Leads Kanban (`/leads`)
*   **[HIGH] Usability:** The Kanban board lacks drag-and-drop functionality (`dnd-kit`). Users must click a dropdown inside the card to change status, breaking the visual Kanban paradigm.
*   **[MEDIUM] Missing Feature:** Clicking a lead card does not open a slide-out panel (Sheet) for quick edits. Users must navigate away or edit inline clumsily.
*   **[MEDIUM] Missing Feature:** No Lead Scoring or "Temperature" (Hot/Warm/Cold) indicators, which are standard in HubSpot.

### 2.4 Customers & Customer Details (`/customers`)
*   **[HIGH] Usability:** Adding a contact or location to a customer currently lacks a dedicated UI on the Customer Details page. The backend supports it (`CustomerContact`, `Location`), but the UI forces it to be done during initial creation or not at all.
*   **[MEDIUM] Data Visibility:** The `ActivityTimeline` shows that a communication occurred, but clicking an email/call does not open the transcript or email body.

### 2.5 Tasks (`/tasks`)
*   **[HIGH] Missing Feature:** No Calendar or Kanban view for tasks.
*   **[LOW] Missing Feature:** Cannot set tasks to recur.

### 2.6 Settings & Admin (`/settings`)
*   **[CRITICAL] Missing Data:** The backend automatically generates detailed `AuditLogs` for every action (Tenant isolation, Customer creation), but there is **no UI** for Tenant Admins to view their audit logs. This is a massive gap for a security-focused CRM.
*   **[HIGH] Usability:** The Employee list allows removing employees and inviting them, but there is no way to edit an existing employee's role (e.g., promote Member to Admin) without removing and re-inviting them.

### 2.7 Billing (`/settings/billing`)
*   **[HIGH] Fake UI:** The "Upgrade Plan" buttons are stubs. They do not initiate a Stripe Checkout session, even though the `StripeProvider` backend is implemented.

---

## 3. Findings Classification Summary

### CRITICAL (Must fix before launch)
1.  **Global Search is inactive.** Users cannot search for a customer by phone number or name globally.
2.  **Audit Logs are hidden.** Security-conscious tenants cannot view their own audit trails.

### HIGH (Required for parity with modern CRMs)
1.  **Fake Sales Chart.** Dashboard analytics must map to real database aggregates.
2.  **Kanban Drag-and-Drop.** Leads must be draggable.
3.  **Global Quick Add.** Add a `+` button in the header to create Leads/Tasks instantly.
4.  **Billing Checkout.** Connect the Upgrade buttons to Stripe Checkout.
5.  **Edit Employee Roles.** Add ability to modify RBAC roles inline.

### MEDIUM (Strongly Recommended)
1.  **Dashboard Date Filters.**
2.  **Slide-out details panels** for Leads and Tasks to prevent context-switching.
3.  **Clickable Timeline Events** to view email bodies and call transcripts.

---

## 4. Recommended Implementation Order (Phase R.11)

To bridge the gap between the current state and a tier-1 enterprise CRM, the following execution order is recommended for the next phase:

1.  **Phase R.11.1 - The Truth Phase (Analytics & Search)**
    *   Connect the Dashboard Chart to real Prisma aggregated data (grouped by month).
    *   Implement Global Search using a `<Command>` palette (shadcn `cmdk`) that searches Customers, Leads, and Tasks.
2.  **Phase R.11.2 - The Workflow Phase (Kanban & Quick Actions)**
    *   Implement `@dnd-kit` for the Leads board.
    *   Implement Global Quick Add (Sheet/Modal) in the top nav.
3.  **Phase R.11.3 - The Enterprise Security Phase (Settings)**
    *   Build the `/settings/audit` route to expose the `AuditLog` table to Tenant Admins.
    *   Add Role editing to the Employee table.
4.  **Phase R.11.4 - The Revenue Phase (Billing)**
    *   Wire the "Upgrade" buttons to generate Stripe Checkout sessions via Server Actions.
