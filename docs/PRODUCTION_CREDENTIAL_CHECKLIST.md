# Production Credential Checklist

Before deploying to production (`COMMUNICATION_MODE=production`), verify that all required credentials are populated in your production environment variables (e.g., Vercel Secrets).

### Authentication (Clerk)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Starts with `pk_live_`)
- [ ] `CLERK_SECRET_KEY` (Starts with `sk_live_`)
- [ ] `CLERK_WEBHOOK_SECRET` (For provisioning tenants/users)

### Database (PostgreSQL)
- [ ] `DATABASE_URL` (Ensure `pgbouncer=true` is appended for serverless environments)
- [ ] Verified DB connection limit handles peak loads

### Caching & Queues (Redis)
- [ ] `REDIS_URL` (Required for BullMQ background workers and caching)

### Email Communication (Resend)
- [ ] `RESEND_API_KEY` (Required for Outbound Email)
- [ ] Domain is verified in Resend dashboard

### Telephony (Twilio)
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER` (Must support Voice and SMS)
- [ ] Configured Twilio webhook pointing to `https://<domain>/api/webhooks/twilio`

### Messaging (WhatsApp)
- [ ] `META_WHATSAPP_TOKEN`
- [ ] `META_PHONE_NUMBER_ID`
- [ ] `META_BUSINESS_ACCOUNT_ID`

### Billing & Payments (Stripe)
- [ ] `STRIPE_SECRET_KEY` (Starts with `sk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] Webhook configured in Stripe pointing to `https://<domain>/api/webhooks/stripe`

### Storage (AWS S3 / Cloudflare R2)
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_REGION`
- [ ] `AWS_BUCKET_NAME`

### Monitoring
- [ ] (Optional but recommended) Sentry DSN or Datadog API Keys
