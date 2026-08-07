# Feature Inventory (Phase R.25)

**Date**: 2026-08-06

This document maps the complete architecture of the AI Security CRM backend by inventorying all exported service functions, server actions, and domain models discovered in the source code.

## 1. Authentication & Security Module (`src/modules/auth`)
* `ensureUserProvisioned` - Hybrid Webhook/Sync provisioner for Clerk Users.

## 2. CRM Module (`src/modules/crm`)
* **Lead Services**: `createLead`, `getLeads`, `updateLead`, `convertLeadToCustomer`
* **Customer Services**: `createCustomer`, `getCustomers`, `getCustomerById`, `updateCustomer`
* **Location Services**: `createLocation`, `getLocations`, `getLocationById`, `updateLocation`, `deleteLocation`
* **Task Services**: `createTask`, `getTasks`, `updateTask`, `assignTask`
* **Activity Services**: `createTimelineEntry`

## 3. Communication Module (`src/modules/communication`)
* **Telephony**: `createCall` (Missing: recording, summary, transcripts, transfer, conference).
* **Email**: `sendEmail`
* **Messaging (SMS/WhatsApp)**: `sendMessage`
* **Notifications**: `createNotification`, `sendIncidentNotification`
* **Webhooks**: `processWebhook`

## 4. CCTV Module (`src/modules/cctv`)
* **Camera Management**: `createCamera`, `getCameras`, `getCameraById`, `updateCamera`, `deleteCamera`
* **AI Events**: `simulateAIEvent` (Missing: actual RTSP stream ingestion, ONVIF discovery, WebRTC broadcast).

## 5. Incident Module (`src/modules/incident`)
* **Incident Management**: `createIncident`, `getIncidents`, `getIncidentById`, `updateIncidentStatus`, `assignIncident`, `resolveIncident`

## 6. Billing Module (`src/modules/billing`)
* **Subscription Management**: `getCurrentSubscription`, `getPlans`, `createCheckoutSession`, `processSuccessfulCheckout`, `createSubscription`, `updateSubscriptionStatus`
* **Invoice Management**: `createInvoice`, `updateInvoiceStatus`, `getInvoices`
* **Payment Management**: `createPaymentRecord`, `handlePaymentSuccess`
* **Usage**: `getTenantUsage`

## 7. Reporting Module (`src/modules/reporting`)
* **Metrics**: `getSecurityMetrics`, `getCameraMetrics`, `getCrmMetrics`, `getCommunicationMetrics`
* **Export**: `getIncidentsCsv`, `getCustomersCsv`, `getCommunicationsCsv`

## 8. AI Assistant (`src/modules/ai`)
* **Services**: `askAssistant`, `secureTools`
