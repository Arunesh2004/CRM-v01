# TENANT RECOVERY POLICY DESIGN

## Objective
Define the operational security rules for reversing a Tenant Soft Deletion. This policy establishes *who* can execute the recovery, the *timeframe* permitted, and the *authentication* required. (Note: Restoration logic is NOT implemented in Phase 6.0).

## 1. Recovery Authorization (Who)
- **Only the original `Tenant.ownerId`** may authorize a recovery request.
- **Employees, Admins, and Support Staff** possess exactly zero authority to initiate or approve a tenant recovery.
- If the original owner's identity (e.g., Clerk account) was physically deleted, recovery must require a manual Global Admin override verifying domain ownership (DNS TXT record).

## 2. Recovery Window (Timeframe)
- **Soft Delete Phase (0-30 Days):** The tenant remains in `DELETION_REQUESTED`. During this window, restoration is instantaneous. All relational data (`User`, `Customer`, `Message`) is fully preserved.
- **Hard Delete Phase (Day 30+):** A scheduled background worker executes `prisma.tenant.delete()`, permanently wiping the database row and all cascading relations. Recovery transitions to **NOT SUPPORTED**.

## 3. Security & Validation Requirements
- **Re-Authentication Check:** Restoring a tenant requires the owner to successfully complete a Multi-Factor Authentication (MFA) challenge.
- **Billing Re-Activation:** If the Stripe subscription was canceled during the initial deletion request, the tenant's UI must forcefully trap the owner on a "Re-Activate Subscription" billing page until a valid payment method is authorized. No API calls are permitted until `SubscriptionStatus === ACTIVE`.
- **Audit Logging:** The restoration event must inject a `TENANT_RESTORED` entry into the `AuditLog`.
