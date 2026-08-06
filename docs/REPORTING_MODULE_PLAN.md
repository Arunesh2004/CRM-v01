# Reporting Module Plan

## Existing Data Sources
- **Security**: `Incident` model (tracks open, resolved, and critical security alerts). `AIEvent` model (tracks raw AI detections).
- **Cameras**: `Camera` model (tracks total cameras, location, online/offline status via streamStatus or similar fields).
- **CRM**: `Lead` and `Customer` models.
- **Communication**: `Notification` model and `ActivityTimeline` (tracks sent emails, SMS, WhatsApp, and their success/failure).
- **Billing**: `Subscription`, `Plan`, `UsageEvent`, `Invoice` models.

## Required Analytics
- **Security Metrics**: Total incidents, Open/Resolved ratio, Critical incidents count, Incident trend over time (by date).
- **Camera Metrics**: Total provisioned cameras, active (online) vs inactive (offline).
- **Communication Metrics**: Total notifications dispatched, breakdown by channel (Email/SMS/WhatsApp).
- **CRM Metrics**: Total Leads, Total Customers, Conversion rate (Customers / (Leads + Customers) or similar approximation).
- **Billing Metrics**: Current Plan features used vs limits.

## Missing Components
- Unified `reporting.service.ts` to query and aggregate these cross-module metrics securely for the active tenant.
- Dashboard UI at `/reports` with cards and charts to display the metrics.
- Export mechanism to download the filtered incident, customer, or communication data as CSV.
- Date range filtering controls to pass parameters to the reporting queries.

## Demo Strategy
- Aggregation queries will be built natively with Prisma (`groupBy`, `count`, `aggregate`).
- Basic CSV export will be handled via a server action returning a Base64 encoded string or a downloadable Next.js Route Handler.
- Charts will be rendered using simple Tailwind CSS bar/progress charts or lightweight Recharts (if available) to avoid heavy dependencies. I will build clean, native Tailwind CSS visualization components.

## Production Upgrade Path
- The reporting queries use real Prisma aggregations on actual tables, meaning they instantly scale to production data.
- CSV export architecture can later be expanded to trigger background workers for PDF generation (e.g., Puppeteer).
- Date filters are securely applied to `createdAt` ranges combined with `tenantId` strict scoping.
