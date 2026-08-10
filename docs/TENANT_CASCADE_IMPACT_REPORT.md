# TENANT CASCADE DEPENDENCY AUDIT

## Impact Analysis of Tenant Hard Deletion

This report analyzes every relation defined on the `Tenant` model in `schema.prisma` to determine the consequences of a hard deletion.

| Relation | Destroys Data? | Should Survive? | Legal Retention? | Encryption Required? |
|---|---|---|---|---|
| **Users** | Yes | Yes (Soft Delete) | Yes (Audit Trace) | No |
| **Roles / Permissions** | Yes | Yes | No | No |
| **Customers / Leads** | Yes | Yes | Yes (Data Export) | Yes (PII) |
| **Tasks** | Yes | Yes | No | No |
| **Messages / Convos** | Yes | Yes | Yes (Compliance) | Yes (e-Discovery) |
| **Calls / Recordings** | Yes | Yes | Yes (Wiretap Laws) | Yes |
| **Transcripts / AI** | Yes | Yes | Yes (Compliance) | Yes |
| **Incidents / Cameras** | Yes | Yes | Yes (Security Audits)| No |
| **Audit Logs** | No (Restricts) | Yes | Yes (Forensics) | No |
| **Billing / Subscriptions**| Yes | Yes | Yes (Tax/Financial)| No |
| **Integrations** | Yes | Yes | No | Yes (Tokens) |

## Conclusion
The current `onDelete: Cascade` behavior violates virtually all data compliance and legal retention requirements for enterprise SaaS. If a Tenant is deleted, all communications (Messages/Calls) and financial records (Billing) are instantly destroyed. These records explicitly require legal retention (e-Discovery, IRS compliance). The `Tenant` cascade must be severed.
