# Runtime Failures (Phase R.25)

**Date**: 2026-08-06

These features were executed programmatically and failed definitively due to runtime code defects.

## 1. Incident Creation
* **Feature**: `createIncident()`
* **Runtime Evidence**:
  ```
  PrismaClientValidationError:
  Invalid `tx.incident.create()` invocation in src\modules\incident\incident.service.ts:16:40
  Argument `tenant` is missing.
  ```
* **Database State**: No Incident or Tenant was inserted during this transaction because the Prisma payload was fundamentally invalid and the transaction rolled back.
* **Root Cause**: The service codebase incorrectly invokes `.create()` on the nested relation instead of using `connect: { id }` to attach the Incident to the Tenant.
* **Severity**: Critical.
* **Fix Recommendation**: Correct the Prisma payload schema syntax in `incident.service.ts`.

## 2. Billing Subscriptions
* **Feature**: `createSubscription()`
* **Runtime Evidence**:
  ```
  PrismaClientValidationError: 
  Invalid `prisma.plan.findUnique()` invocation in src\modules\billing\subscription\subscription.service.ts
  Argument `where` of type PlanWhereUniqueInput needs at least one of `id` arguments.
  ```
* **Database State**: No subscription was created.
* **Root Cause**: The backend code passes an `undefined` ID to the `findUnique` query because the input mapping fails upstream.
* **Severity**: Critical.
* **Fix Recommendation**: Add a guard clause ensuring valid IDs are passed, and correct the mapping logic.

## 3. Telephony Participant Creation
* **Feature**: `createCall()`
* **Runtime Evidence**:
  ```
  PrismaClientKnownRequestError: 
  Foreign key constraint violated on CallParticipant_contactId_fkey
  ```
* **Database State**: No call participant was inserted; Postgres rejected the data.
* **Root Cause**: The code attempts to link a non-existent `contactId` to the `CallParticipant` table.
* **Severity**: High.
* **Fix Recommendation**: Pass a valid, pre-existing `contactId` during call insertion.
