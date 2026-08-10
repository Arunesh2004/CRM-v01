# PHASE 5.10: FOUNDATION REMEDIATION ARCHITECTURE REPORT

## PART 1 — TENANT SOFT DELETE ARCHITECTURE DEEP REVIEW

### Authentication Impact
**Expected Lifecycle:** `ACTIVE` → `SUSPENDED` → `DELETION_REQUESTED` → `DELETED`
- **Login:** Users can log into the Identity Provider (Clerk), but the Next.js Middleware must intercept the session. If the mapped `tenantId` is `SUSPENDED` or `DELETED`, the middleware must throw `403 Forbidden` and force a logout.
- **API Access:** `requireTenant()` must actively validate the tenant status. `DELETED` blocks all operational server actions.
- **Background Jobs:** Cron jobs processing emails, billing, or telemetry must skip tenants where `status !== ACTIVE`.
- **Webhooks:** Inbound webhooks (e.g., Twilio call updates) destined for a `DELETED` tenant must be safely acknowledged (HTTP 200 to the provider) but instantly discarded by the service layer to prevent ghost data mutation.

### Recovery Design
**Workflow:** `Deleted Tenant` → `Admin Approval` → `Restore Tenant Status (ACTIVE)` → `Restore User Access` → `Verify Data Integrity`
- **Automatic Restoration:** Because relationships will shift from `Cascade` to `Soft Delete` (retaining foreign keys), flipping a tenant's `deletedAt` back to `null` will instantaneously and flawlessly restore all Users, Roles, Customers, and historical data.
- **Manual Intervention:** Expired Webhook subscriptions (e.g., WhatsApp token refresh missed during the deletion window) must be manually re-authenticated by the Tenant Owner.

---

## PART 2 — DISASTER RECOVERY ARCHITECTURE DESIGN

### Backup Strategy
**Recommendation:** Event Sourcing is over-engineered for a standard CRUD SaaS. We must employ a dual-layer strategy:
1. **Database Provider Snapshots:** Rely on the Managed Database (AWS RDS/Vercel) for global Point-In-Time-Recovery (PITR). This is strictly for catastrophic, platform-wide unrecoverable failure (e.g., a rogue developer `DROP TABLE`).
2. **Application-Level Tenant Exports:** Required for single-tenant DR without global rollbacks. 

### Tenant Export System
**Design:** A specialized background worker (BullMQ/Inngest) that serializes a single tenant's entire relational tree.
- **Data Extracted:** Identity (Tenant, Users, Roles), Business (CRM, Tasks), Communications, Security Logs, and Settings.
- **Safety & Encryption:** Exports must be encrypted at rest using AES-256 before being uploaded to a segregated AWS S3 bucket.
- **Feasibility:** Completely feasible. Prisma's `include` tree makes extracting a bounded dataset straightforward.

### Tenant Restore System
**Design:** An administrative CLI import pipeline.
- **Validation:** Parse JSON, verify schema version.
- **Conflict Handling:** Since the tenant was hard-deleted (hypothetically), we re-insert using original UUIDs. If a UUID collision occurs, the import must gracefully abort.
- **Audit Preservation:** Restored audit logs must append a new meta-event: `SYSTEM: TENANT_RESTORED_FROM_BACKUP`.

---

## PART 3 — BILLING ENGINE ARCHITECTURE REVIEW

### Payment Provider Layer
**Abstraction Design:** We must implement a generalized `BillingProvider` interface (`createCustomer`, `createSubscription`, `cancelSubscription`, `handleWebhook`). This isolates the core platform from Stripe/Razorpay SDKs. 

### Subscription Enforcement
**Design:** A Feature Entitlement Service middleware.
- **Implementation:** `checkEntitlement(tenantId, resource, requestedAmount)`. 
- **Locations:** Inserted inside Server Actions. E.g., before `prisma.customer.create`, the system verifies if `currentCustomers < plan.maxCustomers`.

### Billing Security
**Security Layers:**
- **Unauthorized Upgrades:** Server actions for `/upgrade` strictly require the `OWNER` identity context (via `Tenant.ownerId`).
- **Webhook Spoofing:** Blocked by Stripe's `stripe.webhooks.constructEvent` signature verification.
- **Invoice Manipulation:** Invoices are immutable ledgers synced via webhook; the application layer cannot manually execute a `prisma.invoice.update` to alter a total.

---

## PART 4 — REAL ENTERPRISE FAILURE SCENARIOS

| Scenario | Current Capability | Gap | Required Architecture |
|---|---|---|---|
| **1. Owner accidentally deletes company** | Permanent Data Loss | No Soft Deletion | Implement Tenant Soft Deletion lifecycle immediately. |
| **2. Employee maliciously deletes data** | Protected by RBAC | No Audit alerts | RBAC stops unauthorized deletes; soft deletes allow Admins to recover maliciously deleted CRM entities. |
| **3. Payment fails for company** | Nothing | No suspension logic | Webhook triggers `status = SUSPENDED`, locking users out until invoice is settled. |
| **4. Database corruption** | Provider snapshot restore | Affects all tenants | Requires application-level single-tenant JSON backup pipeline. |
| **5. GDPR/Data Export request** | Basic CSV export | Missing structural data | Build the full Tenant Export System (JSON). |
| **6. Complete deletion request** | Immediate Cascade Wipe | Missing cooling off period | Introduce `DELETION_REQUESTED` with a 30-day cron job for permanent hard deletion. |
| **7. Restoration post-deletion** | Impossible | Hard Cascade | Soft deletion flips `deletedAt` to `null`. |

---

## PART 5 — PHASE 6 PRIORITY ROADMAP

### P0 Critical: Required before accepting real customers
1. **Tenant Soft Deletion Architecture**
   - **Complexity:** Medium (Schema update, stripping Cascades, writing a global un-delete service).
   - **Testing:** High (Ensuring no orphaned records breach boundaries).
2. **Billing Foundation Implementation**
   - **Complexity:** High (Stripe integration, webhook handlers, entitlement middleware).
   - **Testing:** High (Payment failures, upgrade prorations).

### P1 Important: Required before scaling
1. **Application-Level Tenant Export System (JSON DR backups)**
   - **Complexity:** High (Deep Prisma serialization without memory overflow).

### P2 Enhancement: Can wait
1. **Tenant Restore CLI Tool**
   - **Complexity:** High (Complex relational hydration).

---

## PART 6 — FINAL FOUNDATION DECISION

### Classification: A) FOUNDATION READY FOR PHASE 6 FEATURES

**Justification:** 
The foundational security (tenant isolation, RBAC, cryptographic identity) is fundamentally flawless. The identified risks (Soft Deletion, Disaster Recovery exports, Billing implementation) do not require tearing down Phase 1-5's architecture—they are standard features that cleanly belong as the very first deliverables of Phase 6. 

We possess the explicit blueprints to safely remediate these gaps. Phase 6 implementation is clear to begin.
