# PHASE S16.1A.2M.3 — Client Demo Tenant Design

## 1. Executive Summary
This document outlines the architecture for a permanent, isolated "CRM Client Demo" environment in Production. The design relies entirely on existing multi-tenant data structures, bypassing external integrations, and avoiding destructive privileges by utilizing strict RBAC enforcement.

## 2. Tenant & User Architecture
- **Tenant Isolation**: The system's fundamental architecture naturally isolates data via the `tenantId` Prisma relationship. A dedicated Tenant named "CRM Client Demo" will guarantee zero cross-contamination with the "Production Verification" tenant or real customers.
- **Dedicated Demo User**: A single, shared user (e.g., `demo@yourdomain.com`) will be provisioned strictly within this new tenant.

## 3. RBAC & Role Selection
- **Safest Recommended Role**: `MEMBER` (or `DEMO_USER`). 
- **Analysis**: The application explicitly enforces administrative checks against the `TENANT_ADMIN` and `GLOBAL_ADMIN` role strings across user management, role management, and department creation. 
- **Capabilities**: A `MEMBER` role allows standard CRUD operations on CRM objects (Customers, Leads, Deals, Tickets) when granted the corresponding `RolePermission` records, but inherently blocks:
  - Inviting/deleting users.
  - Reassigning roles or escalating privileges.
  - Modifying Tenant-wide configuration.

## 4. Safely Supported CRM Modules
The following core modules can safely contain and interact with demo records:
- **Customers, Contacts, Leads, Deals (Pipeline)**
- **Tickets (Helpdesk) & Tasks**
- **Communications (Internal Mail, Logs)**
- **Incidents & Security Events**

## 5. Seed Script Analysis & External Side Effects
- **Existing Seed Scripts**: `scripts/seed-demo-tenant.ts` already contains logic to generate robust demo data (100 Customers, 200 Leads, 100 Deals, 200 Calls, 5000 Messages, Pipelines/Stages).
- **External Integrations Safety**: 
  - The seed scripts use direct Prisma database inserts (`prisma.call.createMany`, `prisma.message.createMany`), completely bypassing service layers.
  - Direct database inserts **do not** trigger Twilio, Resend, WhatsApp, or Webhooks.
  - During live usage by a client, external services (like SMS/CCTV) require valid API keys or JWT secrets configured per-tenant. By deliberately omitting these configurations from the demo tenant, the CRM will gracefully fail or mock external calls, guaranteeing no billing side effects or accidental emails.

## 6. Shared Credentials & Account Security
- **The Risk**: Because Clerk Live manages authentication, any logged-in user can typically access the Clerk `<UserButton />` to change their password or email, potentially locking out other users.
- **The Solution**: 
  1. The shared email must be controlled by the administrator (e.g., an alias or shared inbox).
  2. Clerk configuration should disable the Account Management portal (or hide the `<UserButton />` for the demo user based on their role) to prevent credential modification.

## 7. Safe Reset / Reseed Mechanism
- A targeted reset script can safely query and delete all child records (Customers, Deals, Leads, etc.) where `tenantId = <Demo-Tenant-ID>` using cascaded deletion or ordered Prisma `deleteMany` calls.
- After deletion, the modified `seed-demo-tenant.ts` can be re-run against the exact `tenantId` to refresh the pipeline to its pristine state without affecting the `User` or `Role` records.

## 8. Exact Provisioning Flow (DB-First → Invitation → Clerk Live)
This process completely isolates the Demo identity from the Production Verification identity.

1. **Database Bootstrap**: Run a modified version of `bootstrap-company.ts` (e.g., `bootstrap-demo.ts`) to create the "CRM Client Demo" Tenant, a `MEMBER` Role, and a User with `status: 'INVITED'` and `email: 'demo@yourdomain.com'`.
2. **Generate Invitation**: Execute `generate-bootstrap-invite.ts demo@yourdomain.com` and supply the Demo Tenant ID.
3. **Clerk Live Redemption**: Open the generated `/accept-invite` URL in a fresh browser session, sign up for Clerk using `demo@yourdomain.com`, and accept the invitation.
4. **Data Injection**: Execute `seed-demo-tenant.ts` (modified to accept an existing `tenantId` parameter) to flood the tenant with the 10,000+ realistic demo records.

## 9. Final Classification
**DEMO_ARCHITECTURE_READY** (No application code changes required; only minor script adaptations are needed to target a specific tenant and assign the correct `MEMBER` role).
