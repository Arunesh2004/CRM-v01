# UI Bug Report (Phase R.25)

**Date**: 2026-08-06

## 1. Automated E2E Execution Blocker
* **Feature**: Entire Front-end Workflow (Forms, Modals, Clicks, Inputs).
* **Classification**: `NOT VERIFIED`
* **Reason**: Headless testing of the React UI components cannot authenticate to view the Dashboard or module pages.
* **Exact Blocker**: Clerk Identity Provider Bot Protection detects Playwright/Puppeteer signatures and throws `403 Forbidden` / Cloudflare Turnstile blocks, resulting in `Target Closed: EOF`.
* **Evidence**: Previous script execution logs terminating at the Auth modal.
* **How to Verify Later**: 
  1. Procure a paid Clerk Enterprise tier to inject custom bypass headers.
  2. Implement manual execution by a human QA engineer logging in physically before running Cypress.
  3. Strip `requireAuth()` temporarily on a local dev branch and stub a hardcoded cookie context.
