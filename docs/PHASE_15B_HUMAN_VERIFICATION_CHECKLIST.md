# PHASE 15B — HUMAN OPERATOR VERIFICATION CHECKLIST

**Live deployment**: https://crm-v01.vercel.app  
**Release commit**: `be36165`  
**Date**: 2026-09-17  

---

> **Infrastructure pre-conditions (already machine-verified)**:  
> ✅ `/api/live` = 200  ✅ `/api/ready` (database: ok, redis: ok)  ✅ `/api/health` = 200  
> ✅ 24 routes enforce unauthenticated auth redirect  ✅ No 500s observed  
> ✅ Middleware active in production  ✅ Migration 151 verified present  

---

## SECTION A — ADMIN WORKFLOW

Sign in at https://crm-v01.vercel.app/sign-in using the approved Admin Clerk credentials.

### A1. Authentication
- [ ] Sign-in page loads (Clerk UI visible)
- [ ] Admin sign-in succeeds (no error)
- [ ] Redirected to expected landing page after sign-in
- [ ] Browser shows authenticated state (no sign-in redirect loop)

### A2. Dashboard
- [ ] `/dashboard` loads without 500
- [ ] Dashboard metrics / data render
- [ ] Activity timeline loads
- [ ] Tenant name displayed correctly
- [ ] No unexpected server errors in browser console

### A3. Users / Employees
- [ ] `/employees` page loads and lists employees
- [ ] Employee detail page loads (click one record)
- [ ] Role information renders correctly

### A4. Customers / Contacts
- [ ] `/customers` page loads and lists customers
- [ ] Customer detail page loads (click one record)
- [ ] **CRUD test**: Create a new test customer (`Test Co - {date}`)
- [ ] Navigate away to `/dashboard`
- [ ] Return to `/customers` — test customer appears ✅ Persistence verified
- [ ] Edit the test customer — change a field (e.g., name)
- [ ] Navigate away → return → field change persists ✅

### A5. Leads
- [ ] `/leads` page loads and lists leads
- [ ] Lead detail page loads
- [ ] **CRUD test**: Create a new test lead
- [ ] Navigate away → return → lead appears ✅ Persistence verified
- [ ] Update lead status (e.g., CONTACTED → QUALIFIED)
- [ ] Navigate away → return → status change persists ✅

### A6. Deals / Pipeline
- [ ] `/deals` page loads (list or Kanban view)
- [ ] Deal detail page loads
- [ ] **CRUD test**: Create a new test deal associated with test customer
- [ ] Navigate away → return → deal appears ✅
- [ ] Move deal to next stage
- [ ] Navigate away → return → stage change persists ✅

### A7. Tasks / Timeline
- [ ] `/tasks` page loads
- [ ] Task list renders
- [ ] **CRUD test**: Create a new test task
- [ ] Navigate away → return → task appears ✅
- [ ] Mark task complete
- [ ] Navigate away → return → completion status persists ✅

### A8. Products / Pricing
- [ ] `/products` page loads
- [ ] Product list renders with pricing information

### A9. Quotes
- [ ] `/quotes` page loads and lists quotes
- [ ] Quote detail page loads (or create new)
- [ ] Line items render correctly
- [ ] Totals calculate correctly

### A10. Approvals
- [ ] `/approvals` page loads
- [ ] Approval list renders
- [ ] Approval/rejection action works (if test record available)

### A11. Reporting
- [ ] `/reports` (or `/analytics`) page loads without 500
- [ ] Charts/tables render
- [ ] No data query errors

### A12. Notifications
- [ ] `/notifications` page loads
- [ ] Notification list renders
- [ ] Mark-read / mark-all-read action works

### A13. Inbox (Migration 151 critical verification)
- [ ] `/communication/inbox` loads **without 500** ← **CRITICAL**
- [ ] Message list renders (or empty state, not error)
- [ ] No Prisma error in browser console or network tab
- [ ] Message detail accessible if messages exist
- [ ] **Note result**: PASS / FAIL (any 500 here is a Migration 151 regression)

### A14. Chat (Migration 151 critical verification)
- [ ] `/communication/chat` loads **without 500** ← **CRITICAL**
- [ ] Conversation list renders (or empty state, not error)
- [ ] No Prisma error
- [ ] **CRUD test**: Send a test internal chat message
- [ ] Navigate away → return → message persists ✅
- [ ] **Note result**: PASS / FAIL

### A15. Settings / Audit / Logout
- [ ] `/settings` (or `/settings/integrations`) loads
- [ ] `/settings/audit` loads and shows audit records
- [ ] Audit records show actor (user) information correctly
- [ ] **Logout**: Click logout
- [ ] Navigate to `/dashboard` after logout
- [ ] Expected: Redirect to `/sign-in` ✅

---

## SECTION B — EMPLOYEE WORKFLOW

Clear browser session / use incognito, then sign in at https://crm-v01.vercel.app/sign-in using the approved Employee Clerk credentials.

### B1. Authentication
- [ ] Employee sign-in succeeds
- [ ] Redirected to employee dashboard / permitted landing page
- [ ] No Admin-only content immediately visible

### B2. Employee Dashboard
- [ ] Dashboard loads without 500
- [ ] Tenant context is correct (correct tenant name shown)
- [ ] Dashboard content scoped to Employee's permitted data

### B3. Employee CRM Access
- [ ] Customers accessible (if permitted)
- [ ] Contacts accessible (if permitted)
- [ ] Leads accessible (if permitted)
- [ ] Deals accessible (if permitted)
- [ ] Tasks accessible and editable (if permitted)
- [ ] Timeline/activity accessible

### B4. Employee Communication
- [ ] `/communication/inbox` loads without 500
- [ ] `/communication/chat` loads without 500

### B5. Employee Notifications
- [ ] Notifications load

### B6. Logout
- [ ] Employee logout works
- [ ] Post-logout `/dashboard` redirect → `/sign-in` ✅

---

## SECTION C — AUTHORIZATION BOUNDARY TEST

**While authenticated as Employee**, attempt each of the following Admin-only operations.  
Expected result for each: **DENIED** (403, redirect, or error — not silently allowed).

| Test | Action | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| C1 | Navigate to `/admin` | Denied / redirect | | |
| C2 | Navigate to `/admin/users` | Denied / redirect | | |
| C3 | Navigate to `/admin/permissions` | Denied / redirect | | |
| C4 | Navigate to `/admin/workflows` | Denied / redirect | | |
| C5 | Navigate to `/admin/field-security` | Denied / redirect | | |
| C6 | Attempt to call Admin server action directly | Error / 403 | | |

> ⚠️ **Security rule**: If an Employee can successfully complete an Admin-only action that modifies data or exposes admin-scoped records, classify it as **SECURITY DEFECT — STOP IMMEDIATELY**.

---

## SECTION D — TENANT ISOLATION

If a second synthetic tenant account is available:

| Test | Action | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| D1 | Access Tenant B Customer URL as Tenant A user | Not Found / Denied | | |
| D2 | Access Tenant B Lead URL as Tenant A user | Not Found / Denied | | |
| D3 | Access Tenant B Deal URL as Tenant A user | Not Found / Denied | | |
| D4 | Access Tenant B Employee URL as Tenant A user | Not Found / Denied | | |

If no second synthetic tenant is available:

All D-series: **NOT TESTED — NO SECOND SYNTHETIC TENANT AVAILABLE**

---

## SECTION E — PROVIDER-DEGRADED FEATURES

Record the honest status for each — do not activate credentials:

| Feature | Status | Notes |
|---|---|---|
| External Email (Resend) | DEFERRED | RESEND_API_KEY missing — graceful degradation expected |
| SMS | DEFERRED | Not configured |
| Telephony (Twilio) | DEFERRED | Not configured |
| WebRTC / Calling | DEFERRED | Migration 160 not applied; intentionally deferred |
| Pusher / Realtime | NOT TESTED | Verify if Pusher keys are in Vercel env |
| AI (Gemini) | NOT TESTED | Verify if GEMINI_API_KEY is in Vercel env |
| CCTV | DEFERRED | MediaMTX not configured |

---

## SECTION F — BROWSER / SERVER ERRORS OBSERVED

During the walkthrough, note any:

| Type | Page/Action | Status | Detail |
|---|---|---|---|
| 500 Error | | | |
| Prisma Error | | | |
| JS Console Error | | | |
| Unexpected 404 | | | |
| Unexpected 403 | | | |
| Auth Loop | | | |

---

## SECTION G — FINAL CLASSIFICATION

After completing all sections above, choose **exactly one**:

**READY FOR CLIENT DEMO**  
→ Admin workflow complete ✅ · Employee workflow complete ✅ · Authorization denials correct ✅ · Inbox/Chat working ✅ · No core 500s ✅

**BLOCKED — HOSTED DEFECT**  
→ A core Admin/Employee CRM page or action returns 500 or fails silently

**BLOCKED — SECURITY DEFECT**  
→ Employee can perform Admin-only operation, or tenant isolation fails

**BLOCKED — REQUIRED VERIFICATION**  
→ The walkthrough was not completed (return here and run it)

---

## POST-WALKTHROUGH ACTIONS

After completing the checklist:

1. Update `docs/PHASE_15B_HOSTED_CLIENT_DEMO_AUDIT.md` with results
2. Change the final classification section
3. If READY FOR CLIENT DEMO: prepare the client-facing demo script

**DO NOT** commit, push, deploy, or modify production during this walkthrough.

---

*Checklist prepared by automated release agent. Human operator must complete all checkboxes and provide honest results.*
