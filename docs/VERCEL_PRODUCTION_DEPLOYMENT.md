# Vercel Production Deployment

## 1. Vercel Project Setup
- **GitHub Repository:** `Arunesh2004/CRM-v01`
- **Framework:** Next.js
- **Root Directory:** `/`
- **Build Command:** `npm run build`
- **Install Command:** `npm install`
- **Node Version:** `20.x`

## 2. Production Environment Variables
The following variables must be configured in the Vercel dashboard prior to the initial build.

### Application
```env
APP_MODE=production
NEXT_PUBLIC_APP_URL=https://<vercel-domain>
```

### Database
```env
DATABASE_URL=<Supabase pooled connection>
DIRECT_URL=<Supabase direct connection>
```

### Clerk Production
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<Live Publishable Key>
CLERK_SECRET_KEY=<Live Secret Key>
CLERK_WEBHOOK_SECRET=<Live Webhook Secret>
```
*Note: Ensure Clerk webhook is set to `https://<vercel-domain>/api/webhooks/clerk` and listens for `user.created`, `user.updated`, `user.deleted`.*

### Safe Mock Providers
```env
EMAIL_PROVIDER=mock
SMS_PROVIDER=mock
WHATSAPP_PROVIDER=mock
PAYMENT_PROVIDER=mock
CCTV_PROVIDER=mock
STORAGE_PROVIDER=mock
```

## 3. Database Initialization
Once Supabase is provisioned and the environment variables are active locally or in CI:
- `npx prisma generate`
- `npx prisma migrate deploy`

## 4. Deployment Verification
- [ ] Build succeeds without TypeScript errors
- [ ] No missing environment variables
- [ ] Application loads successfully
- **Deployment URL:** *Pending*

## 5. Production Smoke Test
### Authentication
- [ ] Signup, Login, Logout, Session persistence verified
- [ ] Clerk webhook creates tenant

### CRM
- [ ] Create Lead, Create Customer, Create Task verified
- [ ] Tenant isolation verified

### Communication
- [ ] Mock Email send triggers timeline update

### Billing
- [ ] Mock subscription simulation generates invoice

### CCTV
- [ ] Mock camera registration triggers AI event simulation

---

### **Status:** 🔴 BLOCKED
**Notes:** The Vercel deployment and subsequent smoke tests require manual intervention to provision external cloud resources (Vercel, Supabase, Clerk). Please perform the deployment steps and update this checklist.
