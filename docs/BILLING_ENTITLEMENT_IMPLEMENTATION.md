# Phase B.5.4: Billing Entitlement and Plan Enforcement

## Overview
Phase B.5.4 successfully bridged the gap between raw Billing transactions (Invoices/Payments) and actual SaaS feature logic. By introducing the `EntitlementEngine` and `FeatureGuards`, the CRM can now definitively enforce limits on API requests, user seats, camera feeds, and modular features securely at the Server Action / API layer.

## 1. Entitlement Engine (`entitlement.engine.ts`)
- Built the `CachedEntitlement` interface mapping `SubscriptionStatus`, `PlanLimits`, `PlanFeatures`, and `currentUsage`.
- Engineered the `getTenantEntitlement()` method designed to act as a fast Redis/Memory cache layer to prevent Database lookups on every single restricted API request.
- Centralizes limit definitions: `users`, `cameras`, `storageGb`, `aiRequests`, `communicationMessages`.

## 2. Feature Guards (`feature-guards.ts`)
- Created `requirePlanFeature(tenantId, featureName)` to block Boolean feature entitlements (e.g. `customDomain`, `prioritySupport`).
- Created `requireUsageLimit(tenantId, limitName, incrementBy)` to enforce hard quantitative boundaries (e.g., blocking the addition of a 3rd user on a 2-user plan).
- `requireUsageLimit` proactively updates the in-memory Cache upon successful increment to instantly prevent Race Conditions before async Database workers true-up the SQL state.

## 3. Subscription State Handling
- Integrated `validateSubscriptionState()` into all Feature Guards.
- `ACTIVE`: Allows all resources up to plan limits.
- `PAST_DUE`: Permits a grace period, allowing the guards to gracefully permit read/write while billing retry workers loop on the backend.
- `SUSPENDED` / `CANCELLED`: Structurally throws `SubscriptionStateError`, completely severing access to paid tier actions.

## Testing Results
Validated via `tests/billing-entitlement.test.ts`:
- ✔ Simulated **Starter** plans are correctly blocked from utilizing `Enterprise` specific features like `customDomain`.
- ✔ Simulated quantitative increments (`aiRequests`) are safely permitted until they breach the 100 limit, after which subsequent calls mathematically deny execution via `UsageLimitError`.
- ✔ Overriding the tenant status to `SUSPENDED` mechanically throws a `SubscriptionStateError`, simulating immediate resource lockdown.
- ✔ Cross-Tenant exploitation is impossible as limits are resolved entirely server-side utilizing the hardened Auth context `tenantId`.
