# PHASE 6.0.2 DATA RETENTION POLICY REPORT

## Regulatory Classification
In order to comply with B2B Enterprise SaaS requirements (SOC2, GDPR, CCPA, and general financial regulations), the data within the application requires explicit retention boundaries.

| Data Type | Classification | Recommended Retention Policy | Justification |
|---|---|---|---|
| **Audit Logs** | Security / Forensic | **7 Years** | Mandatory for security breach investigations and SOC2 compliance. |
| **Billing Records** | Financial | **7 Years** | IRS and international tax compliance mandates 7-year retention of invoices and subscription events. |
| **Messages / Emails** | Business / Legal | **Tenant Controlled (Default 3 Yrs)** | E-discovery often requires communications retention, but GDPR right-to-be-forgotten supersedes it unless legally locked. |
| **Calls / Recordings** | PII / Surveillance | **30 - 90 Days** | Audio recordings are high-risk PII (wiretap laws). They should be aggressively purged unless explicitly pinned by an Admin. |
| **Customers / Leads** | Business | **Purge on Tenant Deletion** | The core intellectual property of the tenant. Upon entering the `PURGED` lifecycle state, this must be permanently wiped. |
| **Employees (Users)** | Identity | **Purge PII on Tenant Deletion** | The row can remain (for audit foreign key constraints), but `email` and `name` must be scrambled (e.g., `deleted_user_xyz@purged.system`). |

## Implementation Recommendation (Phase 6.2)
Do not rely on synchronous API calls for purging. Implement a specialized `DataRetentionWorker` (cron job) that runs daily at 00:00 UTC, scanning for entities that exceed their designated retention threshold, and systematically executing hard deletes or PII obfuscation batches.
