# T007-7 Quote Submission Forensic Report

## 1. Executive Summary
A read-only forensic investigation was conducted to determine why Quote submission silently failed during the hosted validation (T007-7-E).
The investigation confirmed that Quote creation does **not** require a `PriceBookEntry` (the schema and service accept `lineItems: []`). The blocker is a **CLIENT VALIDATION DEFECT** paired with an **ERROR-HANDLING/UI REPORTING DEFECT**. 
Specifically, the `QuoteForm` UI allows users to select any Deal and any Customer independently. If they do not match, the `RevenueService` correctly throws a validation error, which is caught and sent to the client as a transient toast. Because the modal remains open and the toast disappears, automation (and users) perceive this as a silent failure.

## 2. Exact Reproduction
- **URL**: `https://crm-v01.vercel.app/quotes`
- **Action**: Click "New Quote"
- **Fields**: 
  - Customer: `Ved Vibes` (First available)
  - Deal: `TEST_007_DEALTEST_007_DEAL` (First available)
  - Price Book: `T007-7 Synthetic PriceBook 2026-09-19`
- **Behavior**: 
  - Click "Create Quote"
  - The submit button briefly transitions state, the Server Action is fired.
  - The modal **remains open** (indicating a non-success path).
  - No Quote is created.
  - A transient error toast is fired but quickly disappears or is missed by the browser automation timeout, resulting in an empty `/quotes` table.

## 3. Browser/Network Evidence
The network executes a `POST` request to the Next.js Server Action router. The server returns HTTP 200 (Action success) but the payload contains:
`{ success: false, error: "Customer mismatch for this deal" }`
No hard network crash occurs.

## 4. Server-Action Execution Trace
1. `QuoteForm.tsx` (Client) captures `dealId`, `customerId`, `priceBookId`, and `lineItems: []`.
2. Calls `createQuoteAction(payload)`.
3. `_createQuoteAction` in `revenue.actions.ts` invokes `RevenueService.createQuote`.
4. `RevenueService.createQuote` checks if `deal.customerId !== customerId`.
5. Since the UI doesn't filter Deals by the selected Customer, the randomly selected Customer and Deal mismatch.
6. Service throws: `throw new Error('Customer mismatch for this deal');`.
7. `_createQuoteAction` catches the error, `sanitizeClientError` preserves it, and returns the error object to the client.
8. Client receives the error, calls `toast.error(res.error)`. The modal `setOpen(false)` is skipped.

## 5. Relevant Source-Code Path
- **UI Component**: `src/components/revenue/QuoteForm.tsx` (Lines 36-51)
- **Server Action**: `src/modules/revenue/actions/revenue.actions.ts` (Lines 27-47)
- **Domain Service**: `src/modules/revenue/revenue.service.ts` (Line 68: `if (deal.customerId !== customerId) throw new Error('Customer mismatch for this deal');`)

## 6. Production Log Evidence
Production logs for this action would show an `Unhandled Action Error: Customer mismatch for this deal` logged by `sanitizeClientError` internally with `category: 'INTERNAL_ERROR'`.

## 7. Database/Schema Contract Involved
- `Quote` model: Requires `tenantId`, `customerId`, `dealId`, `ownerId`, `priceBookId`.
- `QuoteLineItem` model: Relation is optional for Quote creation.

## 8. PriceBook vs PriceBookEntry Dependency Analysis
Quote creation **does NOT require a PriceBookEntry**.
The `RevenueService.createQuote` handles `lineItemsInput: []` safely. It loops over the empty array, calculates subtotal as `0.00`, and successfully creates a Quote with an empty `lineItems` relation. 
The PriceBook itself is the only required commercial reference.

## 9. Exact Root Cause
1. **Unconstrained UI Selection**: The Quote form populates all Customers and all Deals independently. Selecting a Deal that does not belong to the selected Customer triggers a domain invariant error.
2. **Transient Error Reporting**: The resulting error is surfaced only via a transient `toast.error` instead of inline form validation. When automation (or a fast user) misses the toast, the modal simply stays open, looking like a silent fail.

## 10. Security Impact
**None**. The RBAC and tenant controls successfully prevent bad data creation. The system correctly rejects invalid cross-relational data.

## 11. Data-Integrity Impact
**None**. The database remains clean; no orphaned or mismatched Quotes are created.

## 12. Hydration Issue Analysis (#418/#441)
React hydration warnings occur on hard-refresh of `/price-books`. This is a known React 18/19 mismatch between SSR and client rendering (often caused by dynamic dates, theme providers, or auth components rendering differently on the server vs client). It does not block PriceBook functionality and is tracked separately.

## 13. Recommended Minimal Remediation
Modify `QuoteForm.tsx` to:
1. Filter the `Deals` dropdown based on the selected `Customer` to prevent mismatches natively in the UI.
2. Add inline error reporting (e.g., an error banner inside the modal) rather than relying exclusively on transient toasts.

## 14. What Must NOT Be Changed
- Do not alter `RevenueService.createQuote` (its data integrity checks are correct).
- Do not modify Prisma schemas.
- Do not bypass server actions.

## 15. Retest Plan
1. Implement the minimal UI remediation.
2. Ensure the test creates a Quote by selecting a matching Customer and Deal.
3. Verify Quote persistence and Approval workflow.

## 16. Current Status
**BLOCKED** (Due to UI validation/filtering defect preventing valid payload construction during automated/uninformed testing).
