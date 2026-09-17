# Phase 15B — Production Auth Runtime Diagnostic

## 1. Deployment
- **Commit**: `[PENDING DEPLOYMENT]` (debug(auth): instrument production CRM identity resolution)
- **Deployment**: `[PENDING]`
- **Production Alias**: `crm-v01.vercel.app`

## 2. Security Constraints
Confirm:
- [x] No auth bypass
- [x] No DB mutation
- [x] No Clerk mutation
- [x] No credential exposure

## 3. Runtime Clerk Result
- **Authenticated**: `[PENDING RUNTIME EXECUTION]`
- **userId observed**: `[PENDING RUNTIME EXECUTION]`
- **Exact userId**: `[PENDING RUNTIME EXECUTION]`
- **Production Clerk confirmed**: `[PENDING RUNTIME EXECUTION]`

## 4. CRM Lookup
- **Lookup result**: `[PENDING]`
- **User ID**: `[PENDING]`
- **Status**: `[PENDING]`
- **Tenant**: `[PENDING]`
- **Role**: `[PENDING]`

## 5. Identity Synchronization
- **Fallback entered?**: `[PENDING]`
- **Email lookup result**: `[PENDING]`
- **Identity match result**: `[PENDING]`
- **Synchronization result**: `[PENDING]`

## 6. Database
- **Database identity evidence**: `[PENDING]` (Diagnostic query via `$queryRaw`)
- **RLS result**: `[PENDING]`
- **Prisma result**: `[PENDING]`

## 7. requireAuth()
- **Exact input**: Result of `getCurrentUser()`
- **Exact output/Exception**: `[PENDING]`
- **Exact throw condition**: `[PENDING]`

## 8. CRMLayout
- **Exact exception**: `[PENDING]` (Captured by new `CRMLayout auth failure` log)
- **Redirect behavior**: Explicit redirect to `/unauthorized`

## 9. Vercel Runtime Log Timeline
*(To be populated after reproducing the `/unauthorized` problem in production)*
`[PENDING RUNTIME EXECUTION]`

## 10. Root Cause
ROOT CAUSE NOT YET PROVEN

## 11. Exact Evidence
*(To be populated after reproducing)*
`[PENDING]`

## 12. Minimal Fix
*(Do NOT implement it)*
`[PENDING VERIFICATION OF ROOT CAUSE]`

## 13. Validation Plan
1. Deploy this diagnostic instrumentation.
2. Sign in manually with the Production Demo Admin account on `crm-v01.vercel.app`.
3. Reproduce the `/unauthorized` redirect exactly once.
4. Extract the `[AUTH_DIAGNOSTIC]` sequence from the Vercel logs.
5. Determine which branch executed and why `user` resulted in `null`.
