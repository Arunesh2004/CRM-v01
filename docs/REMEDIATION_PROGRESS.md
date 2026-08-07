# CRM SaaS Remediation Progress

## PHASE 1 - P0 BLOCKERS

### BUG-RPT-001
*   **Status**: RESOLVED
*   **Files Changed**:
    *   `src/modules/reporting/reporting.service.ts`
    *   `src/modules/reporting/actions/reporting.actions.ts`
    *   `src/app/(crm)/analytics/page.tsx`
*   **Evidence Resolved**: Removed fabricated strings ("142", "18.4%") and hardcoded reporting logic.
*   **Validation**: Dashboard now displays metrics sourced dynamically from the database (`withTenant` secured). Aggregations leverage existing reporting services.
*   **Remaining Risk**: Low. If no DB records exist, it displays 0.

### BUG-SET-001
*   **Status**: RESOLVED
*   **Files Changed**:
    *   `src/app/(crm)/admin/page.tsx`
*   **Evidence Resolved**: Hardcoded "Acme Corporation" and tenant IDs removed.
*   **Validation**: Uses `getCurrentUserContext` and fetches tenant details from the DB dynamically, ensuring Tenant A sees their own settings.
*   **Remaining Risk**: Low. Assumes `getCurrentUserContext` correctly binds `tenantId`.

### BUG-COM-001
*   **Status**: RESOLVED
*   **Files Changed**:
    *   `src/lib/providers/telephony/telephony.interface.ts`
    *   `src/lib/providers/telephony/twilio.provider.ts`
    *   `src/modules/communication/notification.service.ts`
*   **Evidence Resolved**: Fake SMS dispatch unconditionally logging 'SENT' is removed.
*   **Validation**: `sendSms` implemented in TelephonyProvider interface and Twilio. Dispatch logs success/failure natively based on actual provider results.
*   **Remaining Risk**: Low. Assumes Twilio client configuration is valid in production.

### BUG-CAM-003
*   **Status**: RESOLVED
*   **Files Changed**:
    *   `src/modules/crm/location/location.service.ts`
*   **Evidence Resolved**: "Location not found" creation failure.
*   **Validation**: Missing `tenantId` filtering injected into `getLocations()`, guaranteeing only isolated, tenant-specific dropdown options populate the camera creation form.
*   **Remaining Risk**: None. Tenant bounds strictly enforced on queries.

### BUG-BIL-001
*   **Status**: RESOLVED
*   **Files Changed**:
    *   `src/app/(crm)/billing/page.tsx`
*   **Evidence Resolved**: Fake production billing states.
*   **Validation**: Large explicit "DEMO ONLY" banner correctly applied. Clear warning provided that Stripe integration is simulated.
*   **Remaining Risk**: Low. Explicit UI warning mitigates misrepresentation.

### BUG-MON-001
*   **Status**: RESOLVED
*   **Files Changed**:
    *   `src/components/cctv/CameraStreamCard.tsx`
*   **Evidence Resolved**: Misleading live stream.
*   **Validation**: Replaced ambiguous mock stream with explicit "SIMULATED STREAM / DEMO DATA ONLY" overlay to prevent production claims.
*   **Remaining Risk**: Low. Explicit label satisfies truth-in-advertising.
