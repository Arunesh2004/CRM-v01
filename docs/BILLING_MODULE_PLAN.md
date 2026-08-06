# Billing Module Plan

## Current State
- **Providers**: Implementations for Stripe, Razorpay, and PayPal exist under `src/lib/providers/payment/`. There is a `payment-provider.factory.ts`.
- **Database Schema**: Full models for `Plan`, `Subscription`, `Invoice`, `Payment`, and `UsageEvent` exist in `schema.prisma`. 
- **Billing Module**: Directory `src/modules/billing` has structures for `actions`, `subscription`, `usage`, `payment`, `invoice`.

## Missing Connections
- **Demo Mode Provider**: No `MockPaymentProvider` is wired into the `payment-provider.factory.ts` for when `APP_MODE=demo`.
- **UI Dashboard**: The main `/billing` dashboard to see the current subscription, plan features, invoices, and billing history is missing or incomplete.
- **Subscription Lifecycle Integration**: Upgrading/Canceling UI actions need to be wired through to the server actions.
- **Usage Limits**: While the model `UsageEvent` exists, it needs basic reporting so users can see limit consumption on the dashboard (e.g. Free plan vs Enterprise).

## Demo Approach
- Create a `MockPaymentProvider` that simulates successful checkout and subscription creation without requiring live Stripe/Razorpay keys.
- Update `PaymentProviderFactory` to serve `MockPaymentProvider` in demo mode.
- Create `/billing` dashboard page that reads the active `Subscription` and displays current limits.
- Implement a "Checkout" flow in demo mode that just transitions the user to the selected `Plan` and inserts mock `Invoice` and `Payment` records.

## Production Upgrade Path
- The `PaymentProviderFactory` already supports `STRIPE` and `RAZORPAY`. 
- Production usage simply relies on setting proper `.env` variables and the corresponding webhook routing, which the existing abstraction supports. No UI or business logic needs to change.
