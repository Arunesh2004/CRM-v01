# UI/UX Audit & Design Alignment Report

## A. Current UI Architecture
The application is built on Next.js 14 App Router, utilizing Server Components where possible, with a global `(crm)` route group that enforces a unified dashboard layout (`CRMLayoutClient.tsx`, `Sidebar`). The styling heavily relies on Tailwind CSS with a standard component library (likely shadcn/ui variants like `button.tsx`, `dialog.tsx`, `input.tsx`).

## B. Existing Shared UI Components
Located primarily in `src/components/ui/` and feature-specific folders:
- **Core UI:** `button.tsx`, `Card.tsx`, `dialog.tsx`, `input.tsx`, `textarea.tsx`, `Badge.tsx`, `Tabs.tsx`, `CommandPalette.tsx`.
- **States:** `Skeleton.tsx`, `PageSkeleton.tsx`, `EmptyState.tsx`.
- **CRM/Tables:** Kanban boards (`KanbanBoard.tsx`, `TaskBoard.tsx`), Tables (`CustomerTable.tsx`, `LeadTable.tsx`), Timelines (`ActivityTimeline.tsx`).

## C. Existing Page/Route Inventory
- **Core CRM:** `/dashboard`, `/customers`, `/leads`, `/deals`, `/tasks`, `/locations`.
- **Communications:** `/chat`, `/communication/inbox`, `/communications`.
- **Operations:** `/cameras` (CCTV), `/incidents`, `/monitoring`, `/reports`, `/analytics`.
- **Settings/Admin:** `/settings/employees`, `/settings/audit`, `/admin/users`, `/admin/permissions`.
- **Obsolete SaaS/Billing (Single-Company mismatch):** `/billing`, `/billing/invoices`, `/billing/plans`, `/billing/subscription`, `/billing/usage`, `/settings/billing`.

## D. UI Reference / Design System Analysis
The provided `UI_Refrence.txt` (Nexus CRM) enforces an "Enterprise Demo" aesthetic:
- **Typography:** Space Grotesk (Headers/Display), Inter (Body), IBM Plex Mono (Data/Metrics).
- **Palette:** Deep ink backgrounds (`ink-950: #070B18`, `ink-900`, `ink-800`), Primary Violet (`#7C5CFC`), Accent Cyan (`#22D3EE`), and vibrant statuses (Amber, Emerald, Rose).
- **Aesthetic:** Glassmorphism (`rgba(20,27,51,.55)`), high-contrast borders, sleek dark mode leaning, and micro-animations for hover states.
- **Goal:** We must transition the existing components to use this typography and palette without rewriting the underlying markup semantics unnecessarily.

## E. Page-by-page Visual Problems
- **Dashboard:** Likely lacks the deep "ink" dark mode and high-contrast violet/cyan accents. Typography is likely generic sans-serif instead of Space Grotesk.
- **Kanban Boards (`deals`, `tasks`):** Cards currently lack glassmorphism and modern drop-shadows present in the reference.
- **Data Tables (`customers`, `leads`):** Monospace fonts (IBM Plex Mono) are not being used for raw data/numbers/IDs.
- **Sidebar/Nav:** Needs updates to reflect the Nexus CRM enterprise dark styling and hover states.

## F. Page-by-page UX Problems
- **Company vs. Tenant Mismatch:** The UI currently assumes the user owns a "Tenant" and manages a SaaS subscription. The actual requirement is a **single-company deployment** where users belong to "Departments."
- **Admin vs. Employee:** Global navigation does not clearly delineate the "Department Admin" tools from "Department Employee" tools.
- **Settings:** Billing and Subscription pages pollute the settings space for normal company employees/admins.

## G. Navigation Redesign Proposal
- Remove/Hide "Billing", "Plans", and "Subscriptions" from the primary navigation.
- Group navigation into **Operational** (Deals, Leads, Customers), **Communication** (Inbox, Chat), **Monitoring** (Cameras, Incidents), and **Internal** (Tasks, Employees).
- Standardize the Topbar for search (`CommandPalette`) and global notifications.

## H. Admin Experience Proposal
- **Department Head (Admin):** Needs a specialized view in `/settings/employees` to manage roles, assign leads, and view department-level analytics (`/reports`).
- The `/admin/*` routes should be re-contextualized as "System Configuration" (Integrations, Global Permissions) rather than SaaS-tenant management.

## I. Employee Experience Proposal
- **Department Employee:** Should have a streamlined dashboard focusing purely on their assigned `Tasks`, `Deals`, and `Inbox`.
- Hide all company-wide settings, billing, and global user management from their view.

## J. Department-Oriented Information Architecture
1. **My Workspace:** Dashboard, My Tasks, My Deals.
2. **Department Assets:** Leads, Customers, Communications.
3. **Security/Ops:** Cameras, Incidents, Monitoring.
4. **Configuration (Admins):** Employees, Integrations, Audit Logs.

## K. Responsive/Mobile Improvements
- Kanban boards often break on mobile; ensure horizontal scrolling or stack-view is implemented.
- Tables (`IncidentClientTable`, `CustomerTable`) need responsive wrappers or card-based alternatives for small viewports.
- Sidebar must elegantly collapse into a hamburger menu utilizing the new "Nexus" dark aesthetics.

## L. Accessibility Improvements
- Ensure the high-contrast "ink" backgrounds meet WCAG contrast ratios with the chosen gray text.
- Ensure all custom UI components (`CommandPalette`, `dialog.tsx`) retain ARIA labels, focus trapping, and keyboard navigability.

## M. Loading/Error/Empty-State Improvements
- Standardize the use of `PageSkeleton.tsx` and `Skeleton.tsx` to match the dark glassmorphic look.
- Replace generic text in `EmptyState.tsx` with branded illustrations or branded SVG icons (Cyan/Violet accents).

## N. Obsolete/Legacy UI Candidates (IDENTIFY ONLY - DO NOT REMOVE)
- `src/app/(crm)/billing/*` (All routes: plans, invoices, subscription, usage).
- `src/app/(crm)/settings/billing/*`
- `src/components/billing/*` (PlanCard, SubscriptionCard, UsageCard, etc.)
- Any "Upgrade to Pro" or "Manage Tenant" banners.

## O. Reusable Components That Should Remain
- Routing layouts (`layout.tsx`, `CRMLayoutClient.tsx`).
- Core form handling (`Input`, `Textarea`, forms leveraging React Hook Form).
- Logic wrappers (`KanbanBoardClientWrapper.tsx`).

## P. Components That Should Be Visually Redesigned
- `src/components/ui/*` (Button, Card, Badge, Dialog) to inject Space Grotesk, IBM Plex Mono, and the Ink/Violet color palette.
- Sidebar/Navigation wrapper.
- `DashboardClientView.tsx` metrics cards.
- Data tables and Kanban boards.

## Q. Components That Should Be Replaced (UI ONLY)
- None require complete logical replacement, but `EmptyState.tsx` and `PageSkeleton.tsx` should be entirely rewritten visually to match the new design system.

## R. Exact Files That Would Need UI Changes
- `tailwind.config.ts` (or `tailwind.config.js`) / `src/app/globals.css` (To define new fonts and color tokens).
- `src/app/layout.tsx` (To inject Google Fonts: Space Grotesk, Inter, IBM Plex Mono).
- `src/components/ui/button.tsx`, `Card.tsx`, `Badge.tsx`, `input.tsx`.
- `src/app/(crm)/CRMLayoutClient.tsx` (Sidebar/Nav styling).

## S. Files That MUST NOT BE TOUCHED (Backend/Security/Data/Architecture)
- `src/lib/auth.ts`
- `src/proxy.ts` (Middleware)
- `database/schema.prisma`
- `src/modules/*` (All backend business logic and services).
- `src/app/api/*` (All API routes).
- Any Server Actions (`actions.ts`, etc.) inside feature directories.
- Configuration (`next.config.ts`, `vercel.json`).

## T. Risk Assessment
- **Low Risk:** Changing Tailwind classes in `src/components/ui/*`.
- **Medium Risk:** Modifying `CRMLayoutClient.tsx` could break responsive navigation if state management (open/close) is accidentally altered.
- **High Risk:** Modifying Client Components that directly wrap Server Actions if form payloads are accidentally changed.

## U. Regression Risks
- Breaking mobile navigation while applying the new Sidebar design.
- Accidentally exposing Admin-only links to Employees if conditional rendering logic (`if (user.role === 'ADMIN')`) is removed during visual cleanup.

## V. Recommended Implementation Order
1. **Foundation:** Update `globals.css` and `tailwind.config.ts` with Nexus CRM colors and typography.
2. **Typography Setup:** Add Google Fonts to `src/app/layout.tsx`.
3. **Core UI Tokens:** Update `src/components/ui/*` (Buttons, Cards, Badges) to use the new aesthetic.
4. **Layout & Nav:** Redesign `CRMLayoutClient.tsx` and Topbar.
5. **Views:** Apply typography (IBM Plex Mono) to Tables and Boards.
6. **Cleanup:** Apply new Empty/Loading states.

---

### SAFE UI FILES / COMPONENTS TO MODIFY
- `src/app/globals.css`, `tailwind.config.ts`
- `src/app/layout.tsx` (HTML/Head tags only)
- `src/components/ui/*.tsx`
- `src/app/(crm)/CRMLayoutClient.tsx`
- `src/components/**` (Visual CSS/Tailwind classes only, preserving all props and handlers).

### DO NOT TOUCH — BACKEND / SECURITY / DATA / ARCHITECTURE
- `database/schema.prisma`
- `src/lib/auth.ts`
- `src/proxy.ts`
- `src/modules/**`
- `src/app/api/**`
- Any `action.ts` files or data-fetching functions.
- `.env` files.
