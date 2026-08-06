# Production Live Smoke Test

This document records the results of the final production deployment and live smoke test. 

> [!WARNING]
> This smoke test requires a live Vercel deployment and a production Supabase database. Ensure you have completed all steps in the `PRODUCTION_DEPLOYMENT_CHECKLIST.md` before executing these tests.

## 1. Vercel Deployment Verification
- [ ] **Repository connected to Vercel**
- [ ] **Build Command executed successfully**
- [ ] **Environment Variables applied correctly**
- [ ] **Deployment URL accessible**
- **Deployment URL:** `https://[YOUR_VERCEL_URL]`

## 2. Production Database Verification
- [ ] **Supabase pooled connection active**
- [ ] `npx prisma migrate deploy` executed successfully
- [ ] **Prisma Client responding to queries**

## 3. Authentication Live Test (Clerk)
- [ ] **Clerk Production instance active**
- [ ] **New User Signup successful**
- [ ] **Login & Session handling active**
- [ ] **Webhook delivery confirmed (Tenant created upon user signup)**
- [ ] **Dashboard successfully gated behind Middleware**

## 4. Core SaaS Smoke Test

### CRM
- [ ] **Create Lead:** Successfully created and isolated to tenant.
- [ ] **Create Customer:** Successfully created and linked.
- [ ] **Create Task:** Successfully created and visible in timeline.

### Communication
- [ ] **Email Send (Mock/Live):** Successfully dispatched.
- [ ] **Timeline Update:** Email event correctly logged in the Customer Timeline.

### Billing
- [ ] **Mock Subscription:** Successfully created in Stripe/Razorpay (Test Mode).
- [ ] **Invoice Creation:** Successfully generated and isolated.

### CCTV
- [ ] **Camera Registration:** Successfully registered.
- [ ] **AI Event & Notification:** Successfully triggered and routed.

## 5. Security & Performance Verification
- [ ] **HTTPS Enforced (Vercel default)**
- [ ] **No Environment Leaks (No dev logs exposed)**
- [ ] **Tenant Isolation Intact (No cross-tenant data visible)**
- [ ] **Production Mode Enabled (`APP_MODE=production`)**
- [ ] **First Page Load (< 1.5s TTFB)**
- [ ] **Server Actions executing successfully without 500 errors**

---

### **Execution Results**
**Status:** 🔴 PENDING MANUAL VERIFICATION
**Notes:** The automated agent cannot provision Vercel or Supabase accounts directly. The user must perform the deployment and check off the items above.
