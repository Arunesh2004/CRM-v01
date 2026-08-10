# PHASE 5.5 — OWNER ROLE GOVERNANCE & RBAC IMMUTABILITY AUDIT

## 1. Static Inventory of Role Assignment Workflows
No active application code currently allows an Employee or Admin to spontaneously assign roles via a REST API endpoint. However, the system architecture natively supports role provisioning via backend hooks, and the Prisma client operations exist.

## 2. Employee Privilege Escalation Test
- **Employee assigns OWNER role:** N/A (No API route exists yet, but Prisma permits it).
- **Employee modifies UserRole:** N/A.

## 3. Fake Owner Role Test (The Exploit)
**Simulated Scenario:** Employee B circumvents standard channels (e.g., via a compromised admin endpoint or database insertion) to map themselves to `UserRole: { role: 'OWNER' }`.
**Result:** **VULNERABLE (Exploitable)**
Employee B gains the hardcoded bypass in `src/lib/auth.ts`:
```typescript
if (userRole.role.name === 'OWNER' || ...) return true;
```
Even though Employee B cannot delete the Tenant (as that relies on `assertTenantOwner()`), they gain infinite read/write capability to all operational APIs (Billing, CRM, CCTV).

## 4. Database Constraint Review & Recommendation
The database currently allows the theoretical existence of:
```
Tenant A: ownerId = User A
UserRole: User B = 'OWNER'
```

### Recommendation: Option A
**Remove `'OWNER'` from `UserRole` completely.**
Since Phase 5.4 migrated absolute ownership authority to the `Tenant.ownerId` column, the `'OWNER'` role string is an obsolete relic. It creates a dangerous drift condition where an employee holding the string gains god-mode without possessing true `ownerId` authority. 

The `TENANT_ADMIN` role already serves the exact operational purpose needed for top-level operational administrators. Ownership powers should exclusively rely on `ownerId`.

## FINAL CLASSIFICATION: ❌ BLOCKED
The environment remains exploitable to Role Drift vulnerabilities. The `'OWNER'` string bypass within `src/lib/auth.ts` provides privilege escalation vectors disconnected from the physical `Tenant.ownerId` source of truth. We must execute Option A to remediate this before proceeding.
