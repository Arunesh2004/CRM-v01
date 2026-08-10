# TENANT ARCHIVE LIFECYCLE REVIEW

## Current Implementation
The database currently utilizes the following states:
- `ACTIVE`: Normal operations.
- `SUSPENDED`: Temporarily locked (e.g., failed payments).
- `DELETION_REQUESTED`: The 30-day recovery window.
- `DELETED`: Terminal state (scheduled for hard purge).

## Missing Enterprise Architecture
Enterprise compliance (e.g., GDPR, HIPAA, SEC 17a-4) often forbids true physical deletion of audit logs, financial records, and communication histories. A hard purge (cascading SQL delete) violates legal retention periods.

### Recommendation: Add ARCHIVED and PURGED
We must expand the state machine to include:
- `ARCHIVED`: The Tenant is soft-deleted indefinitely. Access is permanently locked. Data is retained for 7 years solely for legal/compliance discovery.
- `PURGED`: Only PII (Names, Emails, Phone Numbers) is scrubbed (anonymized) via a cron job, while the relational skeleton and numerical analytics remain intact to preserve global platform metrics.

## Security Verdict
The current 4-state lifecycle is adequate for an MVP, but **unsafe** for enterprise compliance if `DELETED` triggers a physical database wipe. The transition to an `ARCHIVED` state must be prioritized before any automated cleanup jobs are written.
