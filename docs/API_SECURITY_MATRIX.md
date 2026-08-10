# API & SERVER ACTION SECURITY MATRIX

This document verifies that every exposed endpoint and server action enforces Authentication, Tenant Context, Role Permissions, and Entity Ownership.

## 1. Next.js API Routes (`src/app/api`)
| Route / Webhook | Auth Mechanism | Tenant Check | Permission Check | Audit Result |
|---|---|---|---|---|
| `api/export` | Clerk JWT `requireAuth` | `requireTenant` | `checkPermission` | PASS |
| `api/health` | None (Public) | N/A | N/A | PASS |
| `api/webhooks/clerk` | Svix Signature Validated | Implicit (System) | N/A | PASS |
| `api/webhooks/stripe` | Stripe Signature | Resolved via DB state | N/A | PASS |
| `api/webhooks/twilio/*` | Twilio Header Auth | Resolved via `providerId` | N/A | PASS |
| `api/webhooks/razorpay` | Razorpay Secret | Resolved via `eventId` | N/A | PASS |
| `api/webhooks/resend/*` | Webhook Secret | Resolved via `emailId` | N/A | PASS |
| `api/webhooks/whatsapp` | Meta Graph API Secret | Resolved via `phoneNumber` | N/A | PASS |

## 2. Server Actions (`src/modules/*/actions`)
Every Next.js `use server` action is fundamentally an API route. We audited the handlers across all domains.

| Domain Module | Auth & Tenant Check | RBAC Enforcement | Record Ownership Check | Audit Result |
|---|---|---|---|---|
| `crm/customer` | `requireTenant()` | `checkPermission('CUSTOMER', ...)` | Prisma `tenantId` constraint | PASS |
| `crm/lead` | `requireTenant()` | `checkPermission('LEAD', ...)` | Prisma `tenantId` constraint | PASS |
| `crm/task` | `requireTenant()` | `checkPermission('TASK', ...)` | Prisma `tenantId` constraint | PASS |
| `crm/location` | `requireTenant()` | `checkPermission('LOCATION', ...)` | Prisma `tenantId` constraint | PASS |
| `incident` | `requireTenant()` | `checkPermission('INCIDENT', ...)` | Prisma `tenantId` constraint | PASS |
| `communication/message`| `requireTenant()` | `checkPermission('COMMUNICATION', ...)` | Prisma `tenantId` constraint | PASS |
| `communication/email` | `requireTenant()` | `checkPermission('COMMUNICATION', ...)` | Prisma `tenantId` constraint | PASS |
| `communication/call` | `requireTenant()` | `checkPermission('COMMUNICATION', ...)` | Prisma `tenantId` constraint | PASS |
| `cctv/camera` | `requireTenant()` | `checkPermission('CCTV', ...)` | Prisma `tenantId` constraint | PASS |
| `billing/*` | `requireTenant()` | `checkPermission('BILLING', ...)` | Prisma `tenantId` constraint | PASS |
| `reporting` | `requireTenant()` | `checkPermission('SYSTEM', ...)` | `tenantId` constraint | PASS |

## CONCLUSION: PASS
100% of internal Server Actions are guarded by the holy trinity of SaaS security: `requireAuth()`, `requireTenant()`, and `checkPermission()`. No action blindly trusts client-provided tenant identifiers. Webhooks successfully rely on cryptographically signed headers and resolve their target tenant context asynchronously using trusted database state instead of payload inputs.
