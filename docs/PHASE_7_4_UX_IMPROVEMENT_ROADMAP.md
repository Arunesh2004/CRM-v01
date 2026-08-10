# PHASE 7.4 UX IMPROVEMENT ROADMAP

*This is a non-exhaustive list of recommended UX micro-improvements for Phase 8 execution.*

## 1. Global Navigation & Accessibility
- **Command Palette (`Ctrl + K`)**: Add a global `cmdk` shortcut to instantly jump between Customers, Leads, and Incidents.
- **Global Notification Center**: Implement a top-nav bell icon pulling from the existing `Notification` model to alert users of critical incident updates regardless of which page they are on.

## 2. Forms & Data Entry
- **Inline Editing**: Convert static fields on the Customer Profile into inline inputs (click-to-edit) rather than requiring a dedicated edit modal.
- **Drag-and-Drop Pipelines**: Add `dnd-kit` to the `/leads` pipeline so users can drag cards between Status columns instead of relying solely on dropdown menus.

## 3. Data Presentation
- **Pagination / Virtualization**: Implement infinite scroll or pagination logic on `customers` and `incidents` list views to prevent potential DOM bloat if a tenant surpasses 10,000 active records.
- **Interactive Filtering**: Implement the disabled date-picker and filter menus in the `/reports` and `/incidents` view by hooking them into URL Search Params (`?status=OPEN&severity=CRITICAL`).

## 4. Feedback & States
- **Toast Notifications**: Add global success/error toasts (e.g. `sonner` or `react-hot-toast`) to provide immediate, non-intrusive feedback when Server Actions complete (e.g., "Incident Resolved Successfully").
