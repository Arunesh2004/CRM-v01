# Phase B.5.2: Billing Event Processing and Lifecycle Workers

## Overview
Phase B.5.2 successfully deployed the asynchronous architecture required to process Stripe and Razorpay transactions safely at enterprise scale. By offloading webhook processing, invoice generation, subscription lifecycle management, and refunds onto `BullMQ` workers, the primary web application is protected from network-bound locking and transient database failures during high-volume billing cycles.

## 1. Webhook Payment Processor (`process-payment-webhook.worker.ts`)
- Configured to consume incoming `WebhookEvent` records queued by the Stripe/Razorpay Edge functions.
- Processes success events (`checkout.session.completed`, `payment.captured`) by mapping them to `Invoice` records to resolve the internal `InvoiceStatus` to `PAID`.
- Processes failure events (`payment.failed`) to transition models to `FAILED` status, logging `failureReason`.
- Strictly enforces tenant isolation; processing relies exclusively on the parsed `tenantId` mapping derived at the provider layer, not the raw client payload.

## 2. Subscription Lifecycle Worker (`sync-subscription.worker.ts`)
- Manages strict transitions between `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, and `CANCELLED`.
- Designed to hook into side-effects: transitioning to `CANCELLED` or `SUSPENDED` explicitly triggers the CRM core to restrict resource creation (e.g., locking API endpoints).

## 3. Invoice Generation Worker (`generate-invoice.worker.ts`)
- Adheres to the **Invoice-First Lifecycle** requirement. Before a customer is charged (or upon subscription renewal triggers), an `Invoice` is generated asynchronously in the `DRAFT` state.
- Will eventually map internal `UsageEvent` metrics (e.g., `VOICE_MINUTES`, `COMMUNICATION`) onto the invoice before finalizing it to `OPEN` to trigger payment collection.

## 4. Refund Payment Worker (`refund-payment.worker.ts`)
- Decouples refund logic from the main thread.
- Processes manual or automatic refunds by connecting to `PaymentProviderFactory` (Stripe/Razorpay SDKs) internally and subsequently mapping the CRM's `Payment` state to `REFUNDED`.

## Testing Results
Validated via `tests/billing-workers.test.ts`:
- ✔ Simulated **Stripe** and **Razorpay** successes successfully trigger internal logging states and resolve payloads appropriately.
- ✔ Simulated payment failures accurately transition statuses without crashing the queue.
- ✔ Simulated cancellation triggers explicit secondary logging events for resource locking.
- ✔ The architecture strictly leverages BullMQ defaults (concurrency controls, exponential backoff) to protect the CRM from Dead-Letter pileups.
