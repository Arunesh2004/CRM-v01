# Phase B: External Provider Production Activation Audit

## Objective
This document outlines the detailed roadmap, technical requirements, and security considerations necessary to safely transition the SaaS foundation's external provider abstractions from mocks into real, production-ready integrations (Resend, Twilio, Meta, Stripe).

---

## 1. Communication Module

### Email Provider (Resend / SendGrid)
- **Current Status**: Mocked. `EmailProvider` interface exists, but only simulates dispatching.
- **Production Requirements**:
  - Requires `@resend/node` or `@sendgrid/mail` SDK.
  - Environment Variables: `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`.
  - Required Webhook Endpoint: `POST /api/webhooks/email` (for delivery, bounce, complaint events).
- **Missing Components**:
  - SDK integration in `src/modules/communication/providers/resend.provider.ts`.
  - HTML email template rendering engine (e.g., React Email).
  - Background job mapping to handle transient network failures.
- **Implementation Steps**:
  1. Install SDK.
  2. Implement `sendEmail()` mapped to the provider's API.
  3. Implement webhook handler mapping payload states to `EmailLog` database records.
- **Security Considerations**:
  - Enforce DKIM/SPF domain verification before allowing tenants to send.
  - Rate Limiting via `DistributedRateLimiter` to prevent spam abuse.
- **Testing Strategy**: Use test API keys. Mock network layer. Verify Webhook deduplication.

### Telephony Provider (Twilio)
- **Current Status**: Mocked. `TelephonyProvider` interface exists.
- **Production Requirements**:
  - Requires `twilio` SDK.
  - Environment Variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_SECRET`.
  - Required Webhook Callbacks: Status Callbacks (ringing, answered, completed), Recording Callbacks.
- **Missing Components**:
  - TwiML generation utility for IVR / call routing.
  - Secure inbound webhook validator utilizing Twilio's request signature.
- **Implementation Steps**:
  1. Install SDK and implement `makeCall()`, `generateTwiML()`.
  2. Map Twilio's inbound callback states directly to `CallLog` entities.
  3. Map Twilio's `RecordingUrl` to download and push to our `S3StorageProvider`.
- **Security Considerations**:
  - Validate `X-Twilio-Signature` strictly to prevent fraudulent call state mutations.
- **Testing Strategy**: Mock Twilio Client. Simulate inbound webhook payloads.

### Messaging Provider (WhatsApp Cloud API)
- **Current Status**: Mocked. `MessagingProvider` interface exists.
- **Production Requirements**:
  - HTTP client (e.g., Axios or native Fetch).
  - Environment Variables: `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_WEBHOOK_VERIFY_TOKEN`.
- **Missing Components**:
  - Approved WhatsApp Template mapping system.
  - Meta Webhook Challenge verification endpoint (`GET /api/webhooks/whatsapp`).
- **Implementation Steps**:
  1. Implement `sendWhatsAppMessage()` using Meta's Graph API.
  2. Implement webhook handler for `read`, `delivered`, and `failed` status updates.
- **Security Considerations**:
  - Webhooks must verify the `X-Hub-Signature-256` HMAC SHA256 signature.
- **Testing Strategy**: Test with Meta's developer test numbers.

---

## 2. Billing Module (Stripe)

- **Current Status**: Mocked. `PaymentProvider` interface exists.
- **Production Requirements**:
  - Requires `stripe` SDK.
  - Environment Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- **Missing Components**:
  - Stripe Checkout Session creation.
  - Stripe Customer Portal generation.
  - Product/Price ID mapping to application Plans.
- **Implementation Steps**:
  1. Install SDK and implement `createCheckoutSession()`.
  2. Implement `POST /api/webhooks/stripe`.
  3. Map `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.
- **Security Considerations**:
  - Enforce `stripe.webhooks.constructEvent()` strictly to prevent fraudulent account upgrades.
  - Map `Stripe.Customer.ID` rigidly to `tenantId`.
- **Testing Strategy**: Execute against Stripe Test Clock for subscription lifecycle tests.

---

## 3. Storage Module (AWS S3 / R2)

- **Current Status**: Implemented and Production Ready (Phase A.4).
- **Production Requirements**:
  - Environment Variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`.
- **Missing Components**: None conceptually. Ready for use by Telephony and CCTV.
- **Security Considerations**:
  - Ensure IAM user strictly has exactly `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`.
  - Bucket must be completely private (Block All Public Access).
- **Testing Strategy**: E2E signed URL generation is already verified.

---

## 4. Webhook Infrastructure

- **Current Status**: Implemented and Production Ready (Phase A.2).
- **Production Requirements**:
  - The core `WebhookEvent` table tracks raw payloads and deduplication perfectly.
- **Missing Components**:
  - Need to write the specific adapters for Twilio, Meta, and Stripe (each uses a different HMAC signature methodology).
- **Security Considerations**:
  - Replay protection is enforced via `processedAt` checks.
- **Testing Strategy**: Inject mock signatures for each future provider adapter to verify rejection of invalid hashes.
