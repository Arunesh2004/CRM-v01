# SERVICE SECURITY INVENTORY & PRISMA MUTATION AUDIT

This document catalogues every Prisma mutation across the application service layer to guarantee tenant isolation and correct RBAC wrappers.

## 1. CRM Service Layer
| File | Mutation | Tenant Check | Permission Check | Audit Classification |
|---|---|---|---|---|
| `task.service.ts` | `prisma.task.create` | ✅ `requireTenant()` | ✅ `checkPermission` | A. Tenant-owned create |
| `task.service.ts` | `prisma.task.updateMany` | ✅ `requireTenant()` | ✅ `checkPermission` | A. Tenant-owned update |
| `activity.service.ts` | `prisma.activityTimeline.create` | ✅ `requireTenant()` | ✅ implicit (internal) | A. Tenant-owned create |

## 2. Communications Service Layer
| File | Mutation | Tenant Check | Permission Check | Audit Classification |
|---|---|---|---|---|
| `messaging.service.ts` | `prisma.message.create` | ✅ `requireTenant()` | ✅ `checkPermission` | A. Tenant-owned create |
| `messaging.service.ts` | `prisma.message.update` | ✅ `requireTenant()` | ✅ `checkPermission` | A. Tenant-owned update |
| `notification.service.ts` | `prisma.notification.create` | ✅ `requireTenant()` | ✅ implicit (internal) | A. Tenant-owned create |
| `telephony.service.ts` | `prisma.call.updateMany` | ✅ `requireTenant()` | ✅ `checkPermission` | A. Tenant-owned update |

## 3. Webhook & Integration Layers
| File | Mutation | Tenant Check | Permission Check | Audit Classification |
|---|---|---|---|---|
| `webhook.service.ts` | `prisma.webhookEvent.create` | ✅ Validated Signature | ⚠️ API Key Auth | D. Audit / Webhook mutation |
| `webhook.service.ts` | `prisma.webhookEvent.update` | ✅ Isolated by ID | ⚠️ Internal Service | D. Audit / Webhook mutation |

## 4. Auth & Provisioning Layer
| File | Mutation | Tenant Check | Permission Check | Audit Classification |
|---|---|---|---|---|
| `clerk/route.ts` | `prisma.user.update/delete` | ✅ Webhook Signature | ⚠️ System Level | D. Core sync mutation |
| `provisioning.service.ts` | `prisma.tenant.create` | ✅ Verified Clerk Context | ⚠️ System Level | A. Core provisioning |

### Mutation Completeness Analysis
- **A. Tenant-owned create:** Every user-facing create endpoint extracts `tenantId` strictly from the server-side JWT session (`requireTenant()`). No mutation trusts client-provided tenant headers.
- **B. Relation mutation:** Foreign keys like `customerId` or `locationId` are automatically constrained by the Prisma schema, and services use `updateMany` combined with `tenantId` to ensure safe relation swapping.
- **C. Permission mutation:** Hardened via `checkPermission` wrapping API route handlers.
- **D. Audit mutation:** Failed operations throw immediately. All audit log and activity timeline inserts occur post-validation.

## CONCLUSION: PASS
All `prisma` mutations inside the service layer are securely wrapped in the Phase 5 multi-tenant context. No orphaned mutations or client-side trust vulnerabilities were discovered.
