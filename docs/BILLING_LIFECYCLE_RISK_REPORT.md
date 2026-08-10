# BILLING LIFECYCLE SAFETY REVIEW

## Lifecycle Audit
The Billing engine is currently missing from the codebase, but the schema (`Subscription`, `Invoice`) exists. Designing the future billing lifecycle requires mapping out these strict dependencies to prevent financial discrepancies.

### Evaluated Risks
1. **Tenant Deletion during Active Subscription:**
   - *Risk:* If a tenant is soft-deleted, Stripe will continue charging their credit card.
   - *Required Fix:* The Tenant Soft-Delete service MUST synchronously fire a `cancelSubscription` call to the Stripe API *before* marking the Tenant as `DELETED`.
2. **Tenant Restoration after Cancellation:**
   - *Risk:* Admin restores a Tenant, but their Stripe subscription was canceled.
   - *Required Fix:* The Restoration pipeline must force the Owner into a "Re-Activate Subscription" UI gateway before allowing API access.
3. **Outstanding Invoices (Unpaid):**
   - *Risk:* A tenant deletes their account to avoid paying an outstanding usage invoice.
   - *Required Fix:* Deletion requests must verify `outstanding_balance === 0`. If balance exists, charge immediately. If charge fails, transition to `SUSPENDED (COLLECTIONS)` rather than `DELETED`.
4. **Webhook Replays:**
   - *Risk:* Stripe re-sends a `payment_failed` webhook for a Tenant that is already `DELETED`.
   - *Required Fix:* Webhook handler must check Tenant Status. If `DELETED`, Ack HTTP 200 to Stripe (so they stop retrying) but perform no DB writes.

## Priority
P0 (Critical). These financial state machines must be integrated directly into the core `TenantService` during Phase 6.
