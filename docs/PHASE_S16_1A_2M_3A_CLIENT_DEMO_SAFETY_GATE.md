# PHASE S16.1A.2M.3A — Client Demo Safety Gate

## 1. Effective MEMBER Permission Matrix
**Analysis**: The CRM architecture employs dynamic RBAC. There is no hardcoded static "MEMBER" role or predefined permission matrix in the database seeds or application code. 
Only `TENANT_ADMIN` and `GLOBAL_ADMIN` have statically defined behavior (they universally bypass all `checkPermission` calls). Any other role, including one named `MEMBER`, starts with **ZERO** effective permissions. Permissions must be explicitly granted via `RolePermission` records linking to `Permission` entities (Resource + Action).

Because no safe baseline role exists in the bootstrap sequence, a dedicated `DEMO_USER` role MUST be explicitly constructed during provisioning with the following exact matrix:

| Resource | CREATE | READ | UPDATE | DELETE | SPECIAL |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **CUSTOMER** | SAFE | SAFE | SAFE | SAFE | - |
| **LEAD** | SAFE | SAFE | SAFE | SAFE | - |
| **DEAL (Revenue)** | SAFE | SAFE | SAFE | SAFE | - |
| **TICKET** | SAFE | SAFE | SAFE | SAFE | - |
| **TASK** | SAFE | SAFE | SAFE | SAFE | - |
| **COMMUNICATION**| SAFE | SAFE | SAFE | SAFE | - |
| **INCIDENT** | SAFE | SAFE | SAFE | SAFE | - |
| **CAMERA (CCTV)**| DENY | SAFE | DENY | DENY | View Streams Only |
| **SYSTEM** | DENY | DENY | DENY | DENY | Protects Webhooks/Integrations |
| **USER / ROLE** | DENY | DENY | DENY | DENY | Protects RBAC/Escalation |

## 2. Public-Demo Capability Classification
Because the system defaults to DENY for non-admins, the dynamically constructed `DEMO_USER` role will be:
- **Tenant Administration**: NOT_SAFE_FOR_PUBLIC_DEMO (Blocked by omitting `SYSTEM` permissions).
- **User Administration**: NOT_SAFE_FOR_PUBLIC_DEMO (Blocked by omitting `USER`/`ROLE` permissions).
- **Destructive Actions**: SAFE_WITH_GUARDRAIL (They can delete customers/leads within the demo tenant, which is acceptable since it's an isolated playground).
- **Access to other Tenants**: SAFE (Hard-blocked by Prisma `tenantId` RLS/isolation logic).

## 3. External Integration/Side-Effect Matrix
| Capability | External Service | Risk Level | Guardrail Enforcement |
| :--- | :--- | :--- | :--- |
| **Email** | Internal Only | SAFE | `MailService` writes DB records only. No Resend/SMTP integration is currently active. |
| **Voice / SMS** | Twilio | SAFE | Requires tenant-level API key configuration (`SYSTEM` config). Blocked by RBAC. `APP_MODE='demo'` also forces `MockTelephonyProvider`. |
| **Webhooks** | Various | SAFE | Requires tenant-level configuration (`SYSTEM` config). Blocked by RBAC. |
| **CCTV** | MediaMTX | SAFE | Requires CCTV Secret and Server config (`SYSTEM` config). Blocked by RBAC. |
| **AI (Gemini)** | GCP | SAFE_WITH_GUARDRAIL | Global credentials exist, but AI triggers are invoked via webhooks or jobs that the demo user cannot directly schedule. |
| **Billing** | N/A | SAFE | Not implemented/active. |

## 4. Seed Data Safety
- **Script Evaluated**: `scripts/seed-demo-tenant.ts`
- **Tenant Scoping**: SAFE. Every `create` call explicitly injects the `tenantId`. No global records are modified.
- **Side Effects**: SAFE. The script uses direct database `createMany` arrays (e.g., `prisma.call.createMany`, `prisma.message.createMany`), which bypass all service-level lifecycle hooks, webhooks, and external API triggers.
- **Duplicate Execution**: UNSAFE. Re-running the script without first purging the tenant will duplicate records (e.g., pipeline stages), causing potential unique constraint violations.
- **PII Risk**: SAFE. Data is cryptographically synthetic or hardcoded (e.g., "Demo Customer X").

## 5. Shared Clerk Account Security
**Risk Level**: UNSAFE
- **Analysis**: Clerk Live provides account management out-of-the-box (e.g., via the `<UserButton />`). Any user logged in as `demo@yourdomain.com` can access the Clerk portal, click "Manage Account", and attempt to change the password, email address, or enable MFA.
- **Impact**: A malicious demo user could hijack the shared credential, locking out all other prospects.
- **Remediation**: The application code MUST be updated to either hide the `<UserButton />` for users with the `DEMO_USER` role, or the Clerk instance itself must have account modification strictly disabled via Clerk Dashboard settings.

## 6. Demo Tenant Structure
The required structural records are:
1. `Tenant`: "CRM Client Demo"
2. `User`: `demo@yourdomain.com`
3. `Role`: `DEMO_USER` (Requires explicit dynamic mapping of safe `RolePermission` records).
4. `UserRole`: Linking the user to `DEMO_USER`.

## 7. Script / Application Change Requirements
To safely provision the demo, the following modifications are strictly required:

- **Application Code Changes**: **REQUIRED**
  - Implement a mechanism (e.g., hiding `<UserButton />`) to prevent Clerk profile modification, or configure Clerk Dashboard to disable email/password changes for the demo account.
- **Provisioning Script Changes**: **REQUIRED**
  - Create a `bootstrap-demo.ts` that constructs the explicit `DEMO_USER` role matrix. The current `bootstrap-company.ts` only provisions `TENANT_ADMIN`.
- **Seed Script Changes**: **REQUIRED**
  - `seed-demo-tenant.ts` creates mock users but does NOT assign them roles. It must be updated to apply the `DEMO_USER` role, otherwise the seeded users will encounter HTTP 403 Forbidden on all actions due to the default-deny RBAC policy.

## 8. Production Provisioning Prerequisites
1. Application PR merged containing Clerk profile protection.
2. `bootstrap-demo.ts` PR merged containing the `DEMO_USER` role builder.
3. `seed-demo-tenant.ts` PR merged resolving the missing `UserRole` associations.

## 9. Final Classification
**DEMO_REQUIRES_CODE_OR_SCRIPT_CHANGES**
