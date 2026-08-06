# Production Deployment Checklist

This document serves as the final Vercel + Supabase deployment checklist for the Multi-Tenant SaaS platform. 

## 1. Deployment Provider Audit (Vercel)
✅ **Node Version:** Ensure Vercel is configured to use Node.js 20.x or higher (compatible with Next.js 16.3.0 and TypeScript 5+).
✅ **Build Command:** `npm run build` (or `next build`). 
✅ **Start Command:** `npm run start` (or `next start`). 
✅ **Install Command:** `npm install` (managed automatically).
✅ **Package Checks:** `package.json` contains no conflicting or unsupported legacy dependencies that would break Vercel edge deployment.

## 2. Environment Variables Checklist
Before triggering the first deployment, the following environment variables **MUST** be securely configured in the Vercel Project Dashboard:

### Application Core
- `APP_MODE=production`
- `NEXT_PUBLIC_APP_URL` (e.g., `https://my-saas-platform.vercel.app`)

### Database (Supabase)
- `DATABASE_URL` (The pooled connection URL, e.g. `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`)
- `DIRECT_URL` (The direct connection URL, e.g. `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`)

### Authentication (Clerk)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET` (from the Clerk Webhook Dashboard pointing to `/api/webhooks/clerk`)

### External Providers
- `EMAIL_PROVIDER=resend` (or `mock` for testing)
- `RESEND_API_KEY`
- `PAYMENT_PROVIDER=stripe` (or `razorpay`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (pointing to `/api/webhooks/stripe`)
- `SMS_PROVIDER=twilio`
- `WHATSAPP_PROVIDER=meta`
- `STORAGE_PROVIDER=s3`
- `CCTV_PROVIDER=mock`

## 3. Database Migration Strategy (Supabase)
To synchronize the Supabase database with the Prisma schema, run the following commands sequentially:

1. **Generate the Client:** `npx prisma generate` (this is automatically executed during the Vercel build step if `prisma` is in dependencies, but verify the postinstall script).
2. **Apply Migrations to Production:**
   Instead of running `npx prisma db push` (which is dangerous for production), the production strategy should be strictly migration-based:
   ```bash
   npx prisma migrate deploy
   ```
   *Note: Ensure `DATABASE_URL` is set locally or in a CI/CD pipeline when executing this command against the production Supabase instance.*

## 4. Clerk Production Configuration
- Create a Production Instance in the Clerk Dashboard.
- **Allowed Domains:** Add the production Vercel URL (e.g., `https://my-saas-platform.vercel.app`).
- **Redirect URLs:** Whitelist `/dashboard` as a safe post-login redirect.
- **Webhooks:** Configure a Clerk webhook pointing to `https://[YOUR_URL]/api/webhooks/clerk`. Ensure you select the following events:
  - `user.created`
  - `user.updated`
  - `user.deleted`
  - `organization.created` (if utilizing Clerk's native orgs alongside the internal Tenant model)

## 5. Security & Hygiene Verification
✅ **No Development URLs:** Confirmed no instances of `localhost` or `ngrok` are hardcoded in the codebase. All webhooks utilize `process.env.NEXT_PUBLIC_APP_URL`.
✅ **No Test Credentials:** The `.env` template `.env.example` has been completely stripped of any real testing secrets.
✅ **Demo Mode Disabled:** The default `APP_MODE` is isolated. Production relies on strict `production` strings, avoiding accidental demo fallback.

## 6. Post-Deployment Smoke Test
Once the Vercel deployment completes successfully, manually execute this journey:
1. **Signup:** Create a new root user via Clerk.
2. **Tenant Creation:** Complete the onboarding wizard to provision a new isolated Tenant.
3. **Dashboard:** Verify metrics load cleanly.
4. **CRM:** Create a Lead, convert it to a Customer, and verify no leakage.
5. **Communication:** Trigger a test outbound mock/live Email and ensure the Audit Log successfully captures it.
6. **Billing:** Subscribe to a Stripe/Razorpay plan utilizing a testing card to verify webhook receipt.
7. **CCTV:** Register a mock camera and ensure the streams proxy without 500 errors.

---
### **Status: READY FOR PRODUCTION**
