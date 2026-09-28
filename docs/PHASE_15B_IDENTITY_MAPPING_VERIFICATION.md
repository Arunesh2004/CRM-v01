# PHASE 15B — IDENTITY MAPPING VERIFICATION

## 1. CRM User Record Locator
- **Status**: CODE VERIFIED ONLY (via seed schema and DB snapshots)
- **Target Record 1**: 
  - **Email**: `admin@acmesecurity.com`
  - **Current clerkId state**: `demo-clerk-admin`
  - **Tenant ID**: `demo-tenant-1` (Acme Security Solutions)
  - **Account Status**: `ACTIVE`
  - **Role**: `GLOBAL_ADMIN`
  - **Onboarding Status**: `COMPLETED`
- **Target Record 2**:
  - **Email**: `demo@company.com`
  - **Current clerkId state**: `demo-clerk`
  - **Tenant ID**: `demo-tenant-1` (Acme Security Solutions)
  - **Account Status**: `ACTIVE`
  - **Role**: `DEMO_VIEWER`
  - **Onboarding Status**: `COMPLETED`
- **Verification**: The values `demo-clerk` and `demo-clerk-admin` are structurally hardcoded into the database by `database/seeds/demo/index.ts` and confirmed present by the database authentication state snapshot (`db_auth_verification.json`).

## 2. Identity Mapping Contract Inspection
- **Status**: CODE VERIFIED ONLY
- **Contract Source**: `src/modules/auth/services/provisioning.service.ts` (`synchronizeClerkIdentity`)
- **Behavior 1 (Target State = `demo-clerk`)**: When the database `clerkId` is `demo-clerk`, and the incoming authenticated Clerk identity is the real Production ID (`user_...`), the condition `user.clerkId === clerkId` resolves to `false`. The application enters the `else` block, outputs `[Provisioning] Identity Reassignment Denied`, and returns `null`. This actively blocks authentication.
- **Behavior 2 (Target State = `null`)**: When the database `clerkId` is `null`, the condition `user.clerkId === null` resolves to `true`. The application binds the new Production `user_...` ID to the database via `executeAsSystem(...)` and returns the successfully authenticated user.

## 3. Constraint Verification
- **Status**: CODE VERIFIED ONLY
- **Requirement for Nullification**: Yes, clearing the `clerkId` to `null` is an absolute requirement of the `synchronizeClerkIdentity` application contract for a previously seeded user.
- **Constraints**: 
  - Prisma Schema: `@@unique([tenantId, clerkId])`. Setting `clerkId` to `null` is safe and satisfies Postgres uniqueness constraints (multiple `null` values are allowed).
  - No invitation constraints are violated because the user `status` is already `ACTIVE` and `onboardingStatus` is `COMPLETED`.

## 4. Production mutation permitted?
**NO.**

**Reasoning**: While the identity-mapping contract *strictly requires* clearing the `clerkId` for the authentication to succeed, the read-only evidence reveals TWO potential seeded target records (`admin@acmesecurity.com` and `demo@company.com`). Because the exact target record intended for the Demo Admin is ambiguous without operator confirmation of the exact email, a blind mutation is unauthorized. 

**Next Step**: The operator must explicitly identify whether `admin@acmesecurity.com` or `demo@company.com` is the intended Production Demo Admin email before the precise mutation can be permitted.
