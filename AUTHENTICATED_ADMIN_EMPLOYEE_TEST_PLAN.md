# Authenticated Admin & Employee Test Plan

This document outlines the exact runtime tests to be executed once a legitimate authenticated session (Admin and/or Employee) becomes available. 

## Evidence Classification Rules
Every test result must be classified strictly using the following criteria:
- **PASS**: Actual production action executed and independently verified to meet the security/property expectation.
- **FAIL**: Actual production action executed and the security/property expectation failed.
- **BLOCKED**: Legitimate prerequisite (such as authentication or external mailbox) unavailable, preventing execution.
- **UNVALIDATED**: Evidence required but not obtained (e.g., test skipped, inconclusive result).
*Note: "Not tested" must never be classified as PASS.*

---

## Exact Execution Order
The execution MUST proceed in this exact sequence:

### A. Admin Authentication (AUTH-01)
- **Prerequisite**: 1 User (Admin credentials).
- **Target**: POST `/sign-in` (Clerk).
- **Expected Property**: Identity Mapping.
- **Expected Behavior**: Clerk session created, database record synced, redirection to dashboard.
- **Evidence**: Auth cookie, successful dashboard load.
- **Cleanup / Mutation**: No cleanup; mutates active session state.

### B. Admin Session Persistence (AUTH-02)
- **Prerequisite**: 1 User (Active Admin session).
- **Target**: `/dashboard` (Reload).
- **Expected Property**: Session Persistence.
- **Expected Behavior**: Page reloads without redirecting to `/sign-in`.
- **Evidence**: 200 OK, Network log.
- **Cleanup / Mutation**: None.

### C. Admin Logout (AUTH-03)
- **Prerequisite**: 1 User (Active Admin session).
- **Target**: User Menu -> Sign Out.
- **Expected Property**: Session Termination.
- **Expected Behavior**: Redirects to `/sign-in`, session cookie cleared.
- **Evidence**: Auth cookie deleted, access to `/dashboard` redirects to `/sign-in`.
- **Cleanup / Mutation**: None. (Requires re-authentication for subsequent tests).

### D. Employee Provisioning (PROV-01)
- **Prerequisite**: 1 User (Active Admin session), 1 external mailbox.
- **Target**: POST `/api/employees/invite`.
- **Expected Property**: Secure Provisioning & Onboarding.
- **Expected Behavior**: Admin invites Employee → Mail delivered → Employee accepts → Mapped to correct tenant → Given limited permissions.
- **Evidence**: DB user row, Tenant association, email delivery verification.
- **Cleanup / Mutation**: Data mutation (new user in tenant). *If mailbox is unavailable, this test is BLOCKED.*

### E. Employee Authentication (AUTH-04)
- **Prerequisite**: 1 User (Provisioned Employee credentials).
- **Target**: POST `/sign-in`.
- **Expected Property**: Employee Identity Mapping.
- **Expected Behavior**: Successful login, redirection to Employee-scoped view.
- **Evidence**: Auth cookie.
- **Cleanup / Mutation**: None.

### F. Employee Session Persistence (AUTH-05)
- **Prerequisite**: 1 User (Active Employee session).
- **Target**: `/dashboard` (Reload).
- **Expected Property**: Session Persistence.
- **Expected Behavior**: Page reloads securely.
- **Evidence**: 200 OK.
- **Cleanup / Mutation**: None.

### G. Employee -> Admin Denial (RBAC-01)
- **Prerequisite**: 1 User (Active Employee session).
- **Target**: `/admin` (Page) and `/api/admin/roles` (API).
- **Expected Property**: Role Isolation (Vertical).
- **Expected Behavior**: Access denied (403 or redirect to unauthorized/404).
- **Evidence**: Server response intercept.
- **Cleanup / Mutation**: None.

### H. Employee Unauthorized Denial (RBAC-02)
- **Prerequisite**: 1 User (Active Employee session).
- **Target**: Unauthorized `UPDATE`, `DELETE`, or `Approval` APIs (e.g., PUT `/api/leads/[id]`).
- **Expected Property**: Action Isolation.
- **Expected Behavior**: Access denied (403 or 404). Server-side enforcement verified.
- **Evidence**: Server response.
- **Cleanup / Mutation**: None.

### I. Admin -> Employee Internal Communication (COMMS-01)
- **Prerequisite**: 2 Users (Admin & Employee active in same tenant).
- **Target**: POST `/api/communication`.
- **Expected Property**: Scoped internal messaging.
- **Expected Behavior**: Message dispatched by Admin is received by Employee in UI/API.
- **Evidence**: UI display, API response.
- **Cleanup / Mutation**: Data mutation (new message).

### J. Tenant Isolation (TENANT-01, TENANT-02)
- **Prerequisite**: 2 Tenants (Employee A in Tenant A, Resource in Tenant B).
- **Target**: Cross-tenant READ (GET `/api/customers/[Tenant B ID]`) & UPDATE (PUT `/api/leads/[Tenant B ID]`).
- **Expected Property**: Horizontal Isolation.
- **Expected Behavior**: Denied (403 or 404). Distinguish between: resource exists but belongs to another tenant (Test 1) vs resource does not exist (Test 2).
- **Evidence**: API Responses.
- **Cleanup / Mutation**: None.

### K. IDOR (IDOR-01)
- **Prerequisite**: 1 or 2 Users (Active session).
- **Target**: Customers, Contacts, Leads, Deals, Quotes, Tasks, Attachments, Downloads, Notifications.
- **Expected Property**: Resource Authorization.
- **Expected Behavior**: Replacing legitimate resource IDs with arbitrary/cross-tenant IDs for both READ and WRITE operations is denied.
- **Evidence**: API Responses.
- **Cleanup / Mutation**: None.

### L. Mass Assignment (MASS-01)
- **Prerequisite**: 1 User (Active session).
- **Target**: POST `/api/leads` payload `{"tenantId": "malicious_tenant"}`.
- **Expected Property**: Input sanitization / Mass assignment prevention.
- **Expected Behavior**: `tenantId` injection is ignored; lead is created in the actor's actual tenant.
- **Evidence**: DB state verification.
- **Cleanup / Mutation**: Data mutation (new lead).

### M. Notification Scoping (NOTIF-01)
- **Prerequisite**: 2 Tenants.
- **Expected Property**: Notification Fencing.
- **Expected Behavior**: Notification fired in Tenant A is entirely unreadable/unreachable by Tenant B.
- **Evidence**: Websocket/API response.
- **Cleanup / Mutation**: None.

### N. Data-Integrity Lifecycle (DATA-01, DATA-02)
- **Prerequisite**: 1 User (Admin).
- **Target**: Lead -> Deal conversion; Self-Approval attempt.
- **Expected Property**: Business Logic Integrity.
- **Expected Behavior**: Lead -> Deal maintains correct linkages. Self-Approval request is explicitly denied.
- **Evidence**: API Responses, UI State.
- **Cleanup / Mutation**: Data mutation (deal creation).

### O. Reporting/Search/Export (REP-01)
- **Prerequisite**: 2 Tenants.
- **Expected Property**: Search/Export leakage prevention.
- **Expected Behavior**: Search results and CSV exports contain solely the actor's tenant data.
- **Evidence**: Downloaded file contents, API JSON.
- **Cleanup / Mutation**: None.

### P. Browser/UI Regression (UI-01)
- **Prerequisite**: 1 User (Admin).
- **Target**: General navigation across core pages.
- **Expected Property**: UI Stability.
- **Expected Behavior**: No hydration mismatches or blank states on standard client-side navigation.
- **Evidence**: Console logs.
- **Cleanup / Mutation**: None.

### Q. PriceBooks Regression & Duplication (PB-01, PB-02)
- **Prerequisite**: 1 User (Admin).
- **Test A**: Hard refresh / direct navigation to `/price-books`. Check if React #418/#441 occurs.
- **Test B**: Verify production uniqueness constraint. Once safe read-only DB access is available, query for duplicate products within the same PriceBook. DO NOT apply the unique schema migration automatically during this test.
- **Expected Property**: Hydration Stability & Data Integrity.
- **Evidence**: Console logs, DB query results.
- **Cleanup / Mutation**: None.

### R. CallSession Migration Verification (MIG-01)
- **Prerequisite**: 1 User (GLOBAL_ADMIN).
- **Target**: GET `/api/diagnostic/migration-check`.
- **Expected Property**: Migration validation.
- **Expected Behavior**: Safely capture the actual production migration state (not inferred from repo files). 
- **Evidence**: JSON API response.
- **Cleanup / Mutation**: None. (DO NOT bypass authentication to run this).
