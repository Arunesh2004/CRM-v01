# Communication Module Plan

## Current Implementation State
- **Providers**: The system currently includes a robust `ProviderFactory` with stub implementations for `EmailProvider` (Resend), `TelephonyProvider` (Twilio), and `MessagingProvider` (WhatsApp).
- **Schema**: Comprehensive `Message`, `Conversation`, and `Notification` models are in place. The `ActivityTimeline` model handles logging.
- **Incident Module**: Completed in Phase R.14, generating security incidents and pushing to `ActivityTimeline`.

## Missing Connections
- **Notification Service**: No unified service coordinates triggering these providers upon an incident.
- **Incident Trigger**: `incident.service.ts` doesn't yet trigger out-of-band communication when an incident is created.
- **UI Dashboard**: The communication dashboard requires improvements to surface outgoing security notifications.

## Demo Strategy
- We will wire the existing providers (`ResendProvider`, `TwilioProvider`, `WhatsAppProvider`) to a unified `NotificationService`.
- For the demo without live provider API keys, these providers will simulate sending out-of-band messages (logging their output natively and through the `ActivityTimeline`).
- When a `CRITICAL` or `HIGH` severity Incident is generated, the `NotificationService` will be invoked to dispatch an email, SMS, and WhatsApp message to the assigned administrators.

## Production Upgrade Path
- The underlying `ResendProvider`, `TwilioProvider`, and `WhatsAppProvider` are already architected cleanly. Moving to production only requires swapping out the internal mocked `console.log` or stub API calls for the actual API SDK clients using production `.env` variables.
- The `NotificationService` will require no architectural rewrite.
