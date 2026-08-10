# PHASE 7.2.7 SETTINGS BEFORE AUDIT

## 1. Existing Functionality
- `src/app/(crm)/admin/page.tsx` currently fetches `tenant` information securely using `requireTenant()` and `prisma.tenant.findUnique`.
- It displays basic tenant name and ID in a simple two-column layout.

## 2. Available Settings & Data Fields
Based on `schema.prisma`:
- **Tenant Model**: `id`, `name`, `status`, `rpoPolicy`, `createdAt`.
- **User Model**: Contains users belonging to the tenant (`email`, `status`, `createdAt`, `roles`).
- **Role Model**: Defines custom roles inside the tenant.
- **Integration Model**: `TenantIntegration` tracks providers like WhatsApp, Email, Telephony.
- **Billing Models**: `Subscription`, `Invoice` linked to `Tenant`.

## 3. UI Limitations & Missing Settings
- The current UI hardcodes "Industry: Technology" and "Require 2FA" instead of fetching it from actual settings or displaying placeholders. 
- There is no unified navigation system (no tabs or sidebars) to manage Organization, People, Security, Integrations, and Billing.
- Does not list actual employees (Users).

We will rewrite `/admin/page.tsx` to include a Sidebar layout fetching `users`, `roles`, and `integrations` to accurately portray the enterprise setup.
