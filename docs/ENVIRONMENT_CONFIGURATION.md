# Environment Configuration

This project strictly enforces environmental separation. To prevent credentials from leaking into the codebase, we maintain two primary environment files.

## Files

1. `.env.example`
   - **Purpose:** Acts as the schema definition for developers to understand what environment variables the platform requires.
   - **Content:** Contains structure and non-sensitive default values (e.g., `redis://localhost:6379`, `NODE_ENV="development"`).
   - **Version Control:** Committed to Git.

2. `.env` (or `.env.local` / `.env.production`)
   - **Purpose:** Houses the actual cryptographic secrets, database strings, and API keys.
   - **Content:** Production values.
   - **Version Control:** Strictly ignored by Git (`.env*` rule).

## Required Provider Credentials

Before deploying this SaaS, you must configure and inject the following credentials:

### 1. Infrastructure
- `DATABASE_URL`: Connection string to PostgreSQL (e.g., Neon, Supabase).
- `DIRECT_URL`: Non-pooled connection string (required by Prisma migrations).
- `REDIS_URL`: Connection string for the BullMQ queue system (e.g., Upstash).

### 2. Authentication (Clerk)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Client-side JWT issuer.
- `CLERK_SECRET_KEY`: Backend admin manipulation token.
- `CLERK_WEBHOOK_SECRET`: Secure webhook verification secret for user synchronization.

### 3. Communication
- `RESEND_API_KEY`: API key for outbound transactional emails.
- `EMAIL_FROM_ADDRESS`: Verified domain sending address.
- `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`: For Voice / SMS routing.
- `TWILIO_WEBHOOK_SECRET`: To verify inbound calls/SMS payloads.
- `META_ACCESS_TOKEN` & `META_PHONE_NUMBER_ID`: WhatsApp Business Cloud API setup.
- `META_WEBHOOK_VERIFY_TOKEN`: Custom token to verify Meta webhook challenges.

### 4. Billing (Stripe / Razorpay)
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Payment execution.
- `STRIPE_WEBHOOK_SECRET`: Vital for secure asynchronous invoice confirmation.
- *(Optional)* `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`: If localized to India.

### 5. Storage (AWS S3 / Cloudflare R2)
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`: S3-compatible IAM credentials.
- `AWS_REGION` & `AWS_BUCKET_NAME`: Bucket definition.
- `AWS_ENDPOINT_URL`: Explicit URL if overriding AWS standard URLs (used for R2).

## Current Connection Status
- **Connected Providers:** None. All values in `.env` are currently blank strings `""` pending manual configuration.
- **Pending:** All third-party secrets listed above must be obtained from their respective dashboards.
