# COMPLETE DELETE OPERATION INVENTORY

## Static Scan Results
A complete static scan was executed across the codebase targeting Prisma physical delete statements (`delete`, `deleteMany`) and soft-delete mutation patterns (`deletedAt`).

### Physical Deletes (`prisma.delete` / `prisma.deleteMany`)
| Location | Operation | Current Behavior | Classification |
|---|---|---|---|
| `api/webhooks/clerk/route.ts` | `prisma.user.delete` | Hard deletes the User when Clerk triggers `user.deleted`. | **A) Must become soft delete.** (Preserves Audit Logs) |

### Logical Deletes (Soft Deletes via `deletedAt`)
| Location | Operation | Current Behavior | Classification |
|---|---|---|---|
| `customer.service.ts` | `update({ data: { deletedAt: new Date() } })` | Soft deletes Customer. | **B) Can remain as is.** |
| `lead.service.ts` | `update({ data: { deletedAt: new Date() } })` | Soft deletes Lead. | **B) Can remain as is.** |
| `task.service.ts` | `update({ data: { deletedAt: new Date() } })` | Soft deletes Task. | **B) Can remain as is.** |
| `location.service.ts` | `update({ data: { deletedAt: new Date() } })` | Soft deletes Location. | **B) Can remain as is.** |
| `incident.service.ts` | `update({ data: { deletedAt: new Date() } })` | Soft deletes Incident. | **B) Can remain as is.** |

### Missing Delete Operations (Cascade Victims)
| Entity | Deletion Function Existence | Current Database Behavior | Classification |
|---|---|---|---|
| `Tenant` | No service function exists. | Hard deletes via DB Cascade if wiped raw. | **A) Must become soft delete.** |
| `Message` | No service function exists. | Hard deletes via DB Cascade. | **A) Must become soft delete.** |
| `Call` | No service function exists. | Hard deletes via DB Cascade. | **A) Must become soft delete.** |
| `Role` | No service function exists. | Hard deletes via DB Cascade. | **A) Must become soft delete.** |

## Summary
The CRM business modules already correctly utilize application-level soft deletes (`deletedAt`). However, the Core Identity modules (`Tenant`, `User`) and Communication logs (`Message`, `Call`) rely dangerously on database-level hard cascades. 

The `Clerk` webhook in particular introduces a massive vulnerability: if a user is deleted from the Clerk dashboard, the webhook triggers `prisma.user.delete`, instantly destroying the user and all their relational traces locally.
