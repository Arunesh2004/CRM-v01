# PHASE 5.11: SOFT DELETE MIGRATION READINESS REPORT

## Real World Company Simulation (Theoretical Safety Check)
We executed a theoretical simulation on a highly populated Tenant Alpha (10k customers) vs Tenant Beta (50k customers).
1. **Alpha requests deletion:** The system flips `status` to `DELETION_REQUESTED`. Stripe subscription is canceled.
2. **Alpha employee attempts access:** The API gateway throws `403 Forbidden` instantly. Clerk session remains technically valid but operationally useless.
3. **Beta continues operation:** `requireTenant()` inherently scopes Beta's queries. Alpha's status transition has zero cross-tenant impact.
4. **Alpha restores after 7 days:** Admin flips `status` to `ACTIVE`. All 10,000 customers instantly re-appear in UI because they were never physically deleted.
5. **Old employee tries old session:** `requireTenant()` successfully allows them back in.

## Phase 6 Implementation Order (The Roadmap)

### P0: Critical Foundation (Must implement before scaling)
1. **Tenant Soft Deletes (Schema & Middleware)**
   - *DB Change:* Remove `onDelete: Cascade` from `Tenant` relation across all core business models.
   - *Backend Change:* Update `auth.ts` / `requireTenant()` to enforce `TenantStatus`.
   - *Migration:* Low risk (schema alteration, no data mutation required for existing records).
2. **Global Query Filters (Prisma Extension)**
   - *Backend Change:* Intercept Prisma `findMany` to inject `deletedAt: null` to prevent ghostly records from surfacing in the UI.

### P1: Operational Essentials (Required for General Availability)
1. **Billing Engine (Stripe Integration)**
   - *Backend Change:* Implement Webhook handlers. Map subscriptions to Tenant Status transitions.
2. **Disaster Recovery (Tenant JSON Export)**
   - *Backend Change:* Build a stream-based JSON exporter to S3 to guarantee single-tenant PITR (Point In Time Recovery).

### P2: Future Improvements
1. **Tenant CLI Import Tool (Restoration script)**

## FINAL CLASSIFICATION: 🟡 YELLOW (Implementation possible with precautions)

**Summary:** 
The transition from Hard Delete to Soft Delete is safe and mathematically isolated. However, implementing it requires extreme caution. **If Prisma cascades are removed without simultaneously deploying the global `deletedAt: null` Prisma Extension (Middleware), the entire SaaS frontend will instantly flood with ghostly, "deleted" records across all active tenants.** 

The implementation must be deployed atomically. We are fundamentally ready to begin Phase 6 code execution.
