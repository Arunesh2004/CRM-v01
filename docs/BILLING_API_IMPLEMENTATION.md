# Billing API Boundary Layer Implementation

## Overview
Phase 5.4 established the API perimeter for the Billing module using Zod validators and Next.js Server Actions. This creates a mathematically sound, RBAC-enforced moat between the frontend React components and the highly sensitive Billing Service layer (built in Phase 5.3).

## Zod Validation Layer

The schemas (`src/modules/billing/validators/`) serve as the first line of defense against malformed client payloads.
- **Strict Parsing**: Every schema terminates with `.strict()`, instantly rejecting prototype pollution attempts or undocumented fields (e.g., injecting an artificial `status: 'PAID'` inside an invoice creation payload).
- **Type Rigidness**: We enforce `.uuid()`, `.positive()` numbers, `.length(3)` for currencies, and strict `.enum()` boundaries for statuses and usage types.

## Server Action Architecture

All Server Actions (`src/modules/billing/actions/`) strictly abide by a five-step sequence:
1. **Zod Validation**: `Schema.parse(payload)` securely coerces and validates data.
2. **`requireAuth()`**: Rejects unauthenticated requests immediately.
3. **`requireTenant()`**: Resolves the active Tenant identity strictly from the secure server context (JWT/Clerk data), preventing client-side `tenantId` spoofing.
4. **`requirePermission()`**: Validates if the user role specifically carries `BILLING:MANAGE`, `INVOICE:CREATE`, etc.
5. **Service Invocation**: Safely passes sanitized arguments to the backend `subscription`, `invoice`, `payment`, or `usage` services.

## Error Handling Pattern

Every action is wrapped in a universal `try-catch` block returning normalized structures:
```typescript
{ success: true, data: result }
// OR
{ success: false, error: 'User-safe error message' }
```
This entirely mitigates trace leakage, database query structure exposure, and Payment Provider secret bleeding into the DOM payload.

## Tests
The CLI tests verified:
- `.strict()` successfully rejects arbitrary metadata injections.
- Zod accurately drops invalid UUIDs and out-of-bound enumerations.
- The Try/Catch patterns guarantee a structured JSON response regardless of deep service failure.
