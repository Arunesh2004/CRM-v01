# Phase R.15.6 Communication Demo Integrity Certificate

## 1. Issue Resolved
- **Root Cause of Duplication**: The `DemoCallProvider` and `DemoEmailProvider` classes were violating architectural boundary patterns by attempting to synthesize end-to-end domain logic (e.g., generating `ActivityTimeline`, `Call`, and `EmailThread` Prisma records natively) during mock transport operations. This bypassed and duplicated the persistence operations already being managed by the primary `CallService` and `EmailService`.

## 2. Calling Integrity Fix
- **Action**: Completely eradicated `prisma.call.create` and `prisma.activityTimeline.create` occurrences from `src/infrastructure/calling/providers/demo.call.provider.ts`. The provider is now restricted to a synchronous `await` loop designed to simulate network transmission delay realistically, before generating a mock `providerCallId`.
- **Service Ownership**: Shifted full ownership of `ActivityTimeline` tracking up into `src/modules/communication/services/call.service.ts`.
- **Result**: Exactly **1 Call** and **1 Timeline** event are produced per UI click. `DemoCallProvider` no longer pollutes the database with detached background timeouts. 

## 3. Email Integrity Fix
- **Action**: Eradicated all `prisma.emailThread.create`, `prisma.emailMessage.create`, and `prisma.activityTimeline.create` events from `src/infrastructure/email/providers/demo.email.provider.ts`. The provider now exclusively generates a `providerMessageId` post-simulation.
- **Service Ownership**: Consolidated timeline event tracking directly inside `src/modules/communication/services/email.service.ts` to execute deterministically alongside the primary transaction flow.
- **Result**: Exactly **1 EmailThread**, **1 EmailMessage**, and **1 Timeline** event are produced per action.

## 4. Chat Regression Verification
- **Result**: **NO IMPACT / STABLE**. Chat was already compliant with the Transport-Only rule in R.15.5 and remains functionally isolated. Exactly **1 Message** is persisted per user send.

## 5. Architectural Boundary Check
- **Compliance Achieved**: `Demo` and future `Production` adapters now exclusively adhere to executing external/network integration steps and mutating transport status.
- **Service Enforcement**: Business logic, timeline construction, customer lookups, and transaction tracking are completely consolidated behind standard Next.js Server Actions invoking internal Domain Services.

## 6. Tenant Isolation Verification
- **Compliance Achieved**: Moving timeline creation into the main services securely relies upon the active execution context's `requireTenant()` block, further preventing orphaned backend scripts from misattributing interactions. The System User fallback (`SYSTEM_${tenantId}`) was cleanly reduced since active user context (`actorId: user.id`) is natively injected from the Service tier.

## 7. Build Output
- **Result**: Zero TypeScript compilation errors (`npm run build` returned success across all routes and API borders).
- **Type Compliance**: All optional parameters (`customerId?`) updated successfully across client-facing endpoints.

## 8. Remaining Production Limitations
- **External Integration Missing**: While the architectural abstraction is complete and fully functional in Demo mode, the actual SDK logic mapping (e.g., Twilio REST clients, Resend APIs) inside the `Production` adapters remains a stub that `throws ProviderNotImplementedError`.
- **Idempotency Limit**: Because idempotency headers (e.g. `X-Idempotency-Key` or Redis caching blocks) are not present at the API level, the application remains susceptible to front-end network retries generating duplicate transmissions. This is accepted behavior for the current local-cache Demo phase but remains a known production upgrade target.

**Status**: **DEMO INTEGRITY RESTORED / COMPLETE**.
