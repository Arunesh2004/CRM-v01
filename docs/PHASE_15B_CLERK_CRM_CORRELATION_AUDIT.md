# PHASE 15B — READ-ONLY PRODUCTION CLERK ↔ CRM IDENTITY CORRELATION

## 1. Confirmed Production Clerk Account
- **Target Account**: `vasudevrathore126`
- **Verified Email**: `vasudevrathore126@gmail.com`
- **Existing Production Clerk identity**: CONFIRMED

## 2. CRM Database Identity Search
**STATUS: BLOCKED (Database Unreachable)**
The live Supabase database transaction pooler (`aws-0-ap-southeast-1.pooler.supabase.com:6543`) remains unreachable from this runner due to IP/firewall restrictions (infinite TCP timeout). 

As instructed, I have STOPPED and provided the exact read-only SQL query required to obtain the evidence. 

### Operator Action Required: Manual SQL Verification
Please run the following read-only SQL query directly against the Production Supabase database to retrieve the target CRM User metadata:

```sql
SELECT 
  u.id AS "CRM User ID",
  u.email AS "Email",
  u."clerkId" AS "Current clerkId",
  u."tenantId" AS "Tenant ID",
  t.name AS "Tenant Name",
  u.status AS "Account Status",
  u."onboardingStatus" AS "Onboarding Status",
  string_agg(r.name, ', ') AS "Assigned Roles"
FROM "User" u
LEFT JOIN "Tenant" t ON u."tenantId" = t.id
LEFT JOIN "UserRole" ur ON u.id = ur."userId"
LEFT JOIN "Role" r ON ur."roleId" = r.id
WHERE u.email = 'vasudevrathore126@gmail.com'
GROUP BY u.id, t.name;
```

*Note: If the above query returns 0 rows, it means the CRM database still uses the seeded demo emails (`admin@acmesecurity.com` or `demo@company.com`) rather than `vasudevrathore126@gmail.com`. If that is the case, you will need to update the email of the target seeded Admin CRM User to match the Production Clerk email.*

## 3. `synchronizeClerkIdentity` Mapping Logic
If a CRM User is found for the exact email, `synchronizeClerkIdentity` requires:
- `clerkId` must either EXACTLY match the true Production `user_...` ID.
- OR `clerkId` must be strictly `null` (which allows the system to bind the new ID securely).
If the CRM User has a placeholder like `demo-clerk` or `demo-clerk-admin`, authentication will be **explicitly denied** ("Identity Reassignment Denied").

## 4. Final Required Answer

**Confirmed Demo Admin CRM User**: BLOCKED (Pending operator SQL execution to confirm existence)

**Current CRM clerkId**: BLOCKED (Pending operator SQL execution)

**Tenant**: BLOCKED (Pending operator SQL execution)

**Role**: BLOCKED (Pending operator SQL execution)

**Existing Production Clerk identity**: CONFIRMED

**Identity mapping mutation required**: YES (Assuming the database contains a hardcoded `clerkId` or mismatched email, a mutation to clear `clerkId` and sync the email is mathematically required by `synchronizeClerkIdentity`).

**Production mutation permitted**: NO — pending explicit operator authorization.
