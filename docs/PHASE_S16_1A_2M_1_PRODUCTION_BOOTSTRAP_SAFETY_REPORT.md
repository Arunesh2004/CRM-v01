# PHASE S16.1A.2M.1 — Production Bootstrap Safety Report

## 1. Executive Conclusion
The provisioning scripts (`bootstrap-company.ts` and `generate-bootstrap-invite.ts`) are **SAFE_WITH_OPERATOR_GUARDRAILS**. They correctly provision the absolute minimum required entities without inserting unnecessary demo data. The invitation token generation is cryptographically secure. However, they lack transactional boundaries (risk of orphaned records on failure) and explicit database targeting protection. Furthermore, `generate-bootstrap-invite.ts` relies on an environment variable (`COMPANY_TENANT_ID`) that must be manually configured by the operator between script executions.

## 2. `bootstrap-company.ts` Mutation Map
- **Tenant**: Creates 1 record (no uniqueness enforced on name). Updates 1 record (sets `ownerId`).
- **TenantBootstrap**: Creates 1 record.
- **Department**: Creates 1 record ('Executive').
- **Role**: Creates 1 record ('TENANT_ADMIN').
- **User**: Creates 1 record (enforces unique email).
- **UserRole**: Creates 1 record (via nested write).
- **Transaction Boundaries**: **NONE**. Each operation is executed independently.
- **Rollback**: **NONE**. If execution fails midway, orphaned records (e.g., a tenant with no users) will remain.
- **Demo Data**: **NONE**. It adheres strictly to the minimal administrative requirements.

## 3. `generate-bootstrap-invite.ts` Mutation Map
- **UserInvitation**: Creates 1 record.
- **Token Generation**: 32 bytes of secure entropy via `crypto.randomBytes()`.
- **Token Storage**: Secure. Only the SHA256 hash (`tokenHash`) is stored.
- **Expiry**: 24 hours.
- **Output**: The raw token is safely printed to the console as a single-use URL and is not logged to disk or external services.

## 4. Invitation Redemption Trace
The complete path (`UserInvitation` -> `POST /api/auth/accept-invite`) is robust:
1. Validates the unexpired, `PENDING` token hash.
2. Validates that the Clerk authenticated user has a verified email matching the invitation.
3. Executes a secure **Prisma Transaction** (`SystemOperation.CLERK_PROVISIONING`) to link the `clerkId`, update the user status to `ACTIVE`, assign roles, and mark the invitation as `ACCEPTED` (preventing reuse).
- **Manual Operations Required After Redemption**: None.

## 5. Production Database Targeting Analysis
- **Targeting Protection**: **NONE**. The scripts use `new PrismaClient()` which blindly inherits `DATABASE_URL` from the local environment/`.env`. There is no confirmation prompt verifying the target environment.
- **Dependency Issue**: `generate-bootstrap-invite.ts` reads `COMPANY_TENANT_ID` from the environment. It does **not** accept the Tenant ID as a CLI argument. The operator must manually extract the Tenant ID output from the first script and export it to their shell environment before running the second script.

## 6. Idempotency Analysis
- **Bootstrap Run Twice**: Will fail on the second run during User creation (Prisma `P2002` Unique Constraint on email), but will create an orphaned duplicate Tenant and Role first due to the lack of transactions.
- **Invitation Run Twice**: Creates multiple valid `PENDING` invitations for the same user.
- **Recovery Procedure**: Because there is no automated rollback, failed bootstraps require manual SQL intervention to delete the orphaned `Tenant`, `Department`, and `Role` records before retrying.

## 7. Security Findings
- **Plaintext Passwords**: NONE. (Delegated to Clerk).
- **Hardcoded Secrets**: NONE.
- **Predictable Tokens**: NONE. (Cryptographically secure).
- **Reusable Tokens**: NONE. (Status transitions to `ACCEPTED`).
- **Mass Assignment**: NONE.
- **Finding 1 (Low)**: Lack of transaction boundaries in `bootstrap-company.ts` can lead to orphaned records.
- **Finding 2 (Medium)**: Lack of explicit production database targeting confirmation.

## 8. Minimal Verification Tenant Analysis
- **Status**: **SAFE**. The script strictly provisions the absolute minimum structural hierarchy (Tenant -> Department -> Admin Role -> Invited User) necessary for the CRM core to function.

## 9. Exact Safe Execution Procedure (Operator Guardrails)
If approved, the operator MUST execute the following exact sequence locally:

1. **Configure Environment**: 
   Ensure your local terminal is configured with the **Production** `DATABASE_URL`.
   `export DATABASE_URL="<production-db-connection-string>"`

2. **Execute Bootstrap**:
   `npx tsx scripts/bootstrap-company.ts --company="Production Verification" --admin-email="<your-email>" --admin-name="Admin User"`

3. **Capture Tenant ID**:
   Copy the `Tenant ID` output from the previous step.

4. **Configure Tenant ID**:
   `export COMPANY_TENANT_ID="<captured-tenant-id>"`

5. **Generate Invite**:
   `npx tsx scripts/generate-bootstrap-invite.ts <your-email>`

6. **Redeem**:
   Navigate to the generated URL in a fresh browser session, sign up/in via Clerk Live, and complete onboarding.

## 10. Final Classification
**SAFE_WITH_OPERATOR_GUARDRAILS**
