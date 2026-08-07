# Demo vs Production Matrix

**Date**: 2026-08-06

This matrix defines what features are actually ready for a localized demo versus what is truly ready for enterprise production.

| Component | Demo Readiness | Production Readiness | Gap to Production |
| :--- | :---: | :---: | :--- |
| **Authentication** | ✅ Ready | ✅ Ready | N/A (Hybrid provisioning handles production races). |
| **CRM (Leads/Customers)** | ✅ Ready (UI/Mock Data) | ❌ Not Ready | Requires rigorous End-to-End browser verification. |
| **Telephony / Voice** | ❌ Not Ready | ❌ Not Ready | No WebRTC or SIP provider backend integration exists. |
| **CCTV & AI Processing** | ❌ Not Ready | ❌ Not Ready | No RTSP stream processors or Computer Vision models deployed. |
| **Email/Messaging** | ✅ Ready (UI Mocked) | ❌ Not Ready | Missing real-time socket connections and robust bounce handling. |
| **Billing (Stripe)** | ✅ Ready (Checkout flows) | ❌ Not Ready | Requires testing against Stripe live mode with real credit cards and webhook verifications. |
| **Multi-Tenant Database** | ✅ Ready | ✅ Ready | Prisma schema uses Strict Foreign Keys and Cascade Deletes. |
