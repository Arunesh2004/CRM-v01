# BACKGROUND PROCESSING ISOLATION AUDIT

## Objective
Verify if background tasks (cron jobs, queues, webhooks) correctly respect a Tenant's soft-deleted or suspended state.

## Current Vulnerability Assessment
1. **Billing Cron:** Currently missing in codebase. When implemented, if it does not filter `status === ACTIVE`, it will attempt to charge credit cards for `DELETED` tenants.
2. **AI Processing / Transcripts:** If a delayed webhook arrives from an AI provider for a `DELETION_REQUESTED` tenant, the system might accidentally write a new transcript to a tenant scheduled for purging.
3. **Email/SMS Syncs:** If a queued SMS fires after a tenant owner clicks "Delete My Account," the customer will still receive the SMS.

## Required Architecture Fix
Every single background processor, queue worker, and inbound webhook must implement a `Tenant Isolation Gate`:
```typescript
const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
if (!tenant || tenant.status !== 'ACTIVE') {
    return { skipped: true, reason: 'Tenant Inactive' };
}
```
Priority: **P0 (Critical)**. This must be the first line of code in any background handler.
