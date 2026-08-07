# Runtime Bug Register (Phase R.25)

**Date**: 2026-08-06

| Bug ID | Module | Severity | Description | Root Cause |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-02** | E2E QA | Critical | Headless browser execution blocked by Clerk Bot Protection. | Authentication Blocker |
| **BUG-03** | Incident | High | `createIncident()` throws `PrismaClientValidationError: Argument 'tenant' is missing` because it incorrectly tries to create/connect a tenant rather than passing `tenantId`. | Runtime Bug (Code Issue) |
| **BUG-04** | Telephony | High | `createCall()` throws `PrismaClientKnownRequestError: Foreign key constraint violated on CallParticipant_contactId_fkey`. | Runtime Bug (Constraint Violation) |
| **BUG-05** | Billing | High | `createSubscription()` throws `PrismaClientValidationError` due to missing `id` property in Prisma `findUnique` Plan query. | Runtime Bug (Code Issue) |
