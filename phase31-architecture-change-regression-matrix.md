# PHASE 31 — ARCHITECTURE CHANGE REGRESSION MATRIX

## Objective
Define the mandatory regression testing gates required for future architectural changes. An architecture change is considered fundamentally unsafe if these specific checks are bypassed.

---

### Regression Matrix

| Architectural Change | Mandatory Regression Tests Required |
| :--- | :--- |
| **Vercel / Supabase Region Change** | Latency benchmark (must be < 1s HTTP P50), DB connectivity check, capacity benchmark, deployment verification. |
| **Database Schema Change** | Prisma schema validation, migration dry-run, DB build, tenant isolation regression. |
| **Database Provider Migration** | Interactive transaction behavior validation, OCC behavior validation, capacity benchmark (multiplexing check). |
| **Authentication Provider Upgrade/Change** | Middleware edge validation, RBAC resolution regression, session forgery prevention, `tenantId` mapping tests. |
| **Next.js Framework Upgrade** | Static build validation, Server Action compilation, Next.js cache bypass tests for mutative endpoints. |
| **Prisma ORM Upgrade** | Build validation, schema validation, `npm run build`, manual interactive transaction test. |
| **External AI Provider Change** | Tenant-scoping boundary verification, provider timeout/failure-handling test. |
| **Billing / Webhook Provider Change** | Cryptographic webhook signature verification, replay attack/idempotency tests. |
| **Event System / Queuing Upgrade** | Guaranteed at-least-once processing verification, soft-delete bypass validation. |
| **Major Business Logic Refactor** | Zod validation verification, error sanitization check, full manual UI functional check. |
