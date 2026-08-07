# Client Demo Capabilities

**Date**: 2026-08-06

## 1. Viable Demo Paths
If the presenter manually logs into the browser UI (bypassing Bot Protection), they can reliably demonstrate:
* **CRM Operations**: Creating and viewing Leads and Locations. The underlying `createLead` backend transaction is stable.
* **Basic Reporting**: The Dashboard Metrics. The `getSecurityMetrics` function securely returns the correct JSON aggregation payload.
* **Scripted AI Chat**: The presenter can ask a highly specific, pre-planned question and the `askAssistant` function will reply with its hardcoded mock string. 

## 2. Unsafe Demo Paths
To prevent catastrophic runtime crashes during a live demo, the presenter **must strictly avoid**:
* Attempting to generate an Incident (crashes backend).
* Attempting to initiate a Telephony Call (crashes backend).
* Attempting to subscribe to a Billing plan (crashes backend).
* Attempting to access live CCTV feeds (feature does not exist).
