# PHASE 8.15 TENANT STATUS ROOT CAUSE REPORT

## Issue Description
When logging into the local development environment for the first time, users encounter:
`Forbidden: Tenant is not ACTIVE` from `src/lib/auth.ts requireTenant()`.

## Investigation & Root Cause
1. **Authentication Flow (`src/lib/auth.ts`)**:
   - `requireAuth()` intercepts the Next.js request.
   - If the user doesn't exist in the local database, it fetches from Clerk and calls `ensureUserProvisionedFromClerk(userId)`.
2. **Provisioning Service (`src/modules/auth/services/provisioning.service.ts`)**:
   - The provisioning service correctly creates a `User`, a `Tenant`, and assigns the `TENANT_ADMIN` role.
   - However, the `Tenant` creation payload omits the `status` field.
3. **Database Schema (`database/schema.prisma`)**:
   - The `Tenant` model defines `status TenantStatus @default(PENDING)`.
   - Because the provisioning service omits the `status`, Prisma applies the default value `PENDING`.
4. **Security Block**:
   - The user is authenticated, but `requireTenant()` strictly enforces:
     ```ts
     if (tenant.status !== 'ACTIVE') throw new Error('Forbidden...');
     ```
   - Since the newly provisioned tenant is `PENDING`, the user is immediately blocked from the application.

## Conclusion
The application works exactly as designed for production, where an admin or billing event must transition a tenant from `PENDING` to `ACTIVE`. However, this breaks local development where no automatic activation mechanism or manual approval flow is hooked up.
