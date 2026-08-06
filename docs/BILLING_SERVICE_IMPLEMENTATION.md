# Billing Service Layer Implementation

## Overview
Phase 5.3 successfully orchestrated the internal business logic for the Billing module. It relies on the previously defined Prisma Schema (5.1) and interfaces with external gateways using the Payment Provider Factory (5.2). 

## Implemented Services

### 1. Subscription Service (`subscription.service.ts`)
- **`createSubscription`**: Initializes a `TRIAL` subscription linked to a `Plan` and records an initial `AuditLog`.
- **`updateSubscriptionStatus`**: Enforces strict finite-state-machine (FSM) transitions. It rejects invalid states (e.g., cannot leap from `ACTIVE` back to `TRIAL`) and gracefully handles lifecycle progression like `PAST_DUE` -> `SUSPENDED`.

### 2. Invoice Service (`invoice.service.ts`)
- **`createInvoice`**: Automatically generates an immutable invoice number (e.g., `INV-123...`) anchored to a subscription.
- **`updateInvoiceStatus`**: Explicitly governs financial immutability. An `OPEN` invoice can advance to `PAID`, but a `PAID` invoice fundamentally blocks mutation attempts back to `DRAFT` or `OPEN`.

### 3. Payment Service (`payment.service.ts`)
- **`createPaymentRecord`**: The bridge tying local state to the Payment Provider. It passes the amount/currency to `PaymentProviderFactory.getProvider('STRIPE').createPayment(...)`, then records the `transactionId` returned by Stripe in a `PENDING` state locally.
- **`handlePaymentSuccess`**: Acknowledges external webhook success triggers. Upgrades the local payment status to `SUCCESS` and atomically advances the linked `Invoice` to `PAID` within a transactional boundary.

### 4. Usage Service (`usage.service.ts`)
- **`recordUsage`**: Functioning as an append-only ledger, it securely injects consumption metrics for `USER`, `CAMERA`, etc.
- **`getUsageSummary`**: Aggregates metered values safely under `requireTenant()` barriers for rapid limits calculation.

## Security Architecture

1. **Prisma Row-Level Isolation**: Every operation (excluding the global webhook trigger handler which performs secondary lookups) invokes `withTenant(tenantId)`. This completely negates the possibility of IDOR (Insecure Direct Object Reference).
2. **Action-Based RBAC Boundary**: Each function actively executes `requirePermission('SUBSCRIPTION', 'CREATE')`, explicitly throwing HTTP 403 Forbidden inside the CLI tests if roles are stripped.
3. **Immutable Financials**: The rigid enforcement inside `invoice.service.ts` protects the SaaS from revenue leakage via manual or API-triggered state rollbacks.
