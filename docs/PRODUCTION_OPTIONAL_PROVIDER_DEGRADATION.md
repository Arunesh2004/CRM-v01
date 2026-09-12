# Production Optional Provider Degradation

## Architectural Principle
The CRM is designed to be **provider-agnostic** and **buyer-configurable**. When the CRM is deployed, the buyer will provide their own credentials for communication, AI, and storage infrastructure.

To ensure the CRM remains fully operational for core features (authentication, database, tenant isolation, encryption) even when optional third-party communication credentials are missing, we implement a **Graceful Provider Degradation** strategy.

## What is a Degraded Provider?
A degraded provider is NOT a mock provider that pretends to succeed. A degraded provider is a defensive placeholder that explicitly intercepts actions and returns a controlled failure state.

### Explicit Failure vs Fake Success
- **Bad Design (Demo Mock):** `return { success: true, messageId: 'mock_123' }`
- **Good Design (Degraded):** `return { success: false, error: 'EMAIL_PROVIDER_NOT_CONFIGURED' }`

By returning explicit `_NOT_CONFIGURED` errors, the system ensures that the UI and background workers know the action failed due to missing configuration, preventing false audit logs or misleading UI success states.

## Implemented Degradations

### Email (Resend)
- **Trigger:** Missing `RESEND_API_KEY`
- **Fallback:** `MockEmailProvider` is injected.
- **Behavior:** Attempts to send email will log a warning and return `{ success: false, error: 'EMAIL_PROVIDER_NOT_CONFIGURED' }`.
- **Service Impact:** `email.service.ts` will catch the error and throw it. The transaction is aborted, and no `mailMessage` or `auditLog` is recorded as sent.

### SMS & Telephony (Twilio)
- **Trigger:** Missing `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN`
- **Fallback:** `MockTelephonyProvider` is injected.
- **Behavior:** Attempts to make calls or send SMS will log a warning and return `{ success: false, error: 'TELEPHONY_PROVIDER_NOT_CONFIGURED' }`.
- **Service Impact:** `telephony.service.ts` catches the error and throws it. The call log is not marked as successfully completed.

### WhatsApp (WhatsApp Business)
- **Trigger:** Missing `WHATSAPP_TOKEN`
- **Fallback:** `MockMessagingProvider` is injected.
- **Behavior:** Attempts to send messages will log a warning and return `{ success: false, error: 'MESSAGING_PROVIDER_NOT_CONFIGURED' }`.
- **Service Impact:** Background workers like `send-whatsapp.worker.ts` explicitly check for this non-transient error and drop the job permanently without recording a success metric.

## Core Services (Never Degraded)
The following infrastructure is considered **CORE** and will trigger a `CRITICAL STARTUP FAILURE` if missing. They will never degrade gracefully:
1. **Database:** `DATABASE_URL`, `DIRECT_URL`
2. **Auth:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
3. **Encryption:** `ENCRYPTION_KEY`
4. **Tenant Isolation:** `COMPANY_TENANT_ID`

## Future Buyer Configuration
When a buyer purchases the CRM, they must provide their own `.env.production` variables. If they choose not to configure Email or SMS, they can safely deploy the system, and those specific communication features will remain visibly disabled/failed in the UI, while the rest of the CRM functions normally.
