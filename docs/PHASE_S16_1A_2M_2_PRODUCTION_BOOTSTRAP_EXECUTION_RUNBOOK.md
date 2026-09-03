# PHASE S16.1A.2M.2 — Production Bootstrap Execution Runbook

## 1. Purpose
This runbook provides a safe, step-by-step procedure for an operator to provision exactly ONE "Production Verification" tenant and ONE invited administrator user in the Production Database, and to subsequently redeem that invitation via the Clerk Live instance. This procedure is designed to prevent accidental targeting of the wrong database, prevent duplicate provisioning, and ensure secure handling of invitation tokens.

## 2. Preconditions
- Operator must have access to the Production `DATABASE_URL` (which connects to the Supabase project `ughcghzhmsruhalngrxp`).
- Operator must have a fresh, unauthenticated browser context (e.g., Incognito window) ready for redemption.
- Operator must NOT modify the repository's `.env` file to inject Production credentials.

## 3. Database Identity Preflight
To ensure the `DATABASE_URL` targets the correct Production Supabase project without printing the password, run this safe preflight script:

**PowerShell / Bash:**
```bash
# Note: Set DATABASE_URL in your temporary shell session first (see section 4)
npx tsx -e "const u = new URL(process.env.DATABASE_URL); console.log('Host:', u.hostname); console.log('Project Match:', u.hostname.includes('ughcghzhmsruhalngrxp') ? 'READY (Production)' : 'NOT READY');"
```
**STOP CONDITION**: If the output does not say `READY (Production)`, DO NOT proceed.

## 4. Safe Environment Setup
To prevent leaking secrets into `.env` or globally, use a temporary shell session and inject the variable.

**Windows PowerShell:**
```powershell
$env:DATABASE_URL="<production-db-connection-string>"
```

**Bash/Zsh (macOS/Linux):**
```bash
export DATABASE_URL="<production-db-connection-string>"
```

## 5. Existing-Data Checks
Before running any mutations, verify that the intended verification identity and tenant do not already exist.

```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); Promise.all([p.user.findUnique({where: {email: '<admin-email>'}}), p.tenant.findFirst({where: {name: 'Production Verification'}})]).then(res => console.log('User Exists:', !!res[0], '| Tenant Exists:', !!res[1]));"
```
**STOP CONDITION**: If `User Exists: true` or `Tenant Exists: true`, STOP. Do not proceed to the bootstrap phase. Escalation is required to determine if the existing records are valid.

## 6. Bootstrap Command
Execute the bootstrap script to create the minimal hierarchy (Tenant -> Department -> Role -> User).

```bash
npx tsx scripts/bootstrap-company.ts --company="Production Verification" --admin-email="<admin-email>" --admin-name="Admin User"
```

## 7. Post-Bootstrap Verification
Capture the `Tenant ID` printed in the success output of the bootstrap script.
Verify the user was created correctly:

```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.user.findUnique({where: {email: '<admin-email>'}, select: {status: true, tenantId: true, userRoles: {include: {role: true}}}}).then(console.log);"
```
**Expected Output**: `status: 'INVITED'`, and a `userRoles` array containing the `TENANT_ADMIN` role mapped to the new `tenantId`.

## 8. Invitation Generation
Set the required environment variable for the invite script:

**Windows PowerShell:**
```powershell
$env:COMPANY_TENANT_ID="<captured-tenant-id>"
```
**Bash/Zsh:**
```bash
export COMPANY_TENANT_ID="<captured-tenant-id>"
```

Execute the generation script:
```bash
npx tsx scripts/generate-bootstrap-invite.ts <admin-email>
```

## 9. Invitation Handling
The script will output a single-use `/accept-invite?token=...` URL.
- **Copy this URL directly to your clipboard.**
- Do NOT paste this URL into chat, documentation, or Git, as it contains a live cryptographic token.

## 10. Clerk Live Redemption
1. Open a fresh **Incognito / Private Browsing** window.
2. Paste the invitation URL into the address bar.
3. Confirm the domain is `crm-v01.vercel.app`.
4. Click **Create Account** or **Sign Up**.
5. Enter the exact `<admin-email>` used during bootstrap and choose a strong password.
6. **DO NOT** use "Continue with Google" (OAuth is not yet fully configured in Production).
7. Complete the email verification step (OTP code sent to email).
8. The application will automatically link the new `clerkId`, mark the invitation as `ACCEPTED`, and redirect to onboarding/dashboard.

## 11. Post-Redemption Verification
Verify that the redemption successfully activated the user in the database:

```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.user.findUnique({where: {email: '<admin-email>'}, select: {status: true, clerkId: true}}).then(res => console.log('Status:', res?.status, '| ClerkId Linked:', !!res?.clerkId));"
```
**Expected Output**: `Status: ACTIVE | ClerkId Linked: true`.

## 12. Failure/Recovery Procedure
If `bootstrap-company.ts` fails (e.g., unique constraint violation, network drop):
1. **Do NOT run it again immediately.**
2. Inspect what was created:
   ```bash
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.tenant.findFirst({where: {name: 'Production Verification'}, include: {users: true, departments: true, roles: true}}).then(res => console.log(JSON.stringify(res, null, 2)));"
   ```
3. If an orphaned tenant exists without an owner/user, **STOP**.
4. Report the orphaned `tenantId`. A targeted manual SQL cleanup (deleting the specific tenant, department, and role) will be required before retrying. **DO NOT issue destructive SQL automatically.**

## 13. Security Warnings
- Never modify the `.env` file to hold Production secrets.
- Always close the terminal window after execution to clear `$env:DATABASE_URL` from memory.
- Treat the `/accept-invite` URL like a password.

## 14. Explicit STOP Conditions
- Preflight fails to match `ughcghzhmsruhalngrxp`.
- Existing-data check finds pre-existing records.
- Bootstrap script crashes or outputs an error.
- Orphaned records are detected.
