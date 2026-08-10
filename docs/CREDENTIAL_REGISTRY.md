# SaaS Credential Registry

This registry maintains a complete record of all external dependencies, their purpose, their current status, and required implementation phases.

## Authentication
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**
  - Purpose: Frontend authentication verification.
  - Status: REAL
  - Required Phase: Foundation
  - Replacement Instructions: Replace via Clerk Dashboard.
- **CLERK_SECRET_KEY**
  - Purpose: Backend API authentication.
  - Status: REAL
  - Required Phase: Foundation
  - Replacement Instructions: Replace via Clerk Dashboard.
- **CLERK_WEBHOOK_SECRET**
  - Purpose: Verify inbound user provisioning webhooks.
  - Status: REAL
  - Required Phase: Foundation
  - Replacement Instructions: Replace via Clerk Webhooks dashboard.

## Database & Caching
- **DATABASE_URL**
  - Purpose: Primary PostgreSQL connection via Prisma.
  - Status: REAL (Local)
  - Required Phase: Foundation
  - Replacement Instructions: Point to production Supabase/Neon URL.
- **DIRECT_URL**
  - Purpose: Direct connection for Prisma migrations.
  - Status: REAL (Local)
  - Required Phase: Foundation
  - Replacement Instructions: Point to production pool bypass URL.
- **REDIS_URL**
  - Purpose: Background job processing (BullMQ) and rate limiting.
  - Status: REAL (Local)
  - Required Phase: Foundation
  - Replacement Instructions: Point to production Redis cluster (e.g., Upstash).

## Email
- **RESEND_API_KEY**
  - Purpose: Transactional and marketing email transport.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Generate key from Resend dashboard.
- **EMAIL_FROM_ADDRESS**
  - Purpose: Verified sender identity.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Use a verified domain identity in Resend.

## Telephony / SMS
- **TWILIO_ACCOUNT_SID**
  - Purpose: Core account identifier for Voice/SMS.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Copy from Twilio console.
- **TWILIO_AUTH_TOKEN**
  - Purpose: API authentication.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Copy from Twilio console.
- **TWILIO_WEBHOOK_SECRET**
  - Purpose: Verify inbound SMS and call state callbacks.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Configure in Twilio webhook settings.

## WhatsApp / Meta
- **META_ACCESS_TOKEN**
  - Purpose: Sending WhatsApp Business API messages.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Generate via Meta Developer Console.
- **META_PHONE_NUMBER_ID**
  - Purpose: Sending identity.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Found in WhatsApp API setup.
- **META_WEBHOOK_VERIFY_TOKEN**
  - Purpose: Custom token to verify Meta webhook registration.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Create randomly and provide to Meta.

## Payments
- **STRIPE_SECRET_KEY**
  - Purpose: Subscription and invoice management API.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Use Stripe Dashboard standard keys.
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**
  - Purpose: Client-side Stripe Elements loading.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Use Stripe Dashboard publishable key.
- **STRIPE_WEBHOOK_SECRET**
  - Purpose: Verify inbound payment success/failure webhooks.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Retrieve from Stripe Webhooks dashboard.
- **RAZORPAY_KEY_ID**
  - Purpose: Alternative payment gateway (India).
  - Status: EMPTY
  - Required Phase: Optional
  - Replacement Instructions: Razorpay dashboard.
- **RAZORPAY_KEY_SECRET**
  - Purpose: Alternative payment gateway (India).
  - Status: EMPTY
  - Required Phase: Optional
  - Replacement Instructions: Razorpay dashboard.

## Cloud Storage
- **AWS_ACCESS_KEY_ID**
  - Purpose: Blob storage for Call Recordings, Data Exports.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Generate IAM user with S3 permissions.
- **AWS_SECRET_ACCESS_KEY**
  - Purpose: Authentication for Blob storage.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Generate alongside Access Key.
- **AWS_REGION**
  - Purpose: Bucket locality.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: e.g., us-east-1
- **AWS_BUCKET_NAME**
  - Purpose: Target storage bucket.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Phase 9
  - Replacement Instructions: Specify exact bucket name.
- **AWS_ENDPOINT_URL**
  - Purpose: Allows R2/Minio substitution.
  - Status: EMPTY (Demo Mode Active)
  - Required Phase: Optional
  - Replacement Instructions: Define if not using standard AWS AWS.
