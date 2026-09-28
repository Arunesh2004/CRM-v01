# Hydration Risk Inventory

This document catalogs potential React hydration risks identified through static code analysis, particularly focusing on components vulnerable to server/client rendering mismatches on hard refresh (React #418, #441).

## Methodology
The repository was scanned for common hydration mismatch patterns:
- Unsafe `Date` usage (`new Date().toLocaleDateString()`, `Intl.DateTimeFormat`)
- `Math.random()` or dynamic UUID generation during render
- `window`, `document`, `navigator`, `localStorage` usage without `useEffect`
- Unstable keys in lists
- Conditional rendering based on client-only state without proper mounting checks

## Findings

| File | Component | Suspected Risk | Confidence | Runtime Confirmation Required |
|---|---|---|---|---|
| `src/app/(crm)/price-books/PriceBooksClient.tsx` | `PriceBooksClient` | **UNVALIDATED** No obvious `Date` parsing during render. Potential risk in `isAdding` initial state or RSC Date object serialization for `PriceBook` instances. | Low | YES (Blocked by Auth) |
| `src/app/(crm)/CRMLayoutClient.tsx` | `CRMLayoutClient` | **UNVALIDATED** Pathname checks `getPageTitle` mismatch if SSR path differs, but handled securely. Mobile menu default state is safe. | Low | NO |
| `src/components/ui/QuickAddMenu.tsx` | `QuickAddMenu` | **POTENTIAL** Uses portal/dropdown state, usually safe but requires verification if it renders dynamically sized items. | Low | YES (Blocked by Auth) |
| `src/components/notifications/NotificationCenter.tsx` | `NotificationCenter` | **POTENTIAL** Rendering relative time (e.g. "2 hours ago") during SSR often causes hydration mismatches if not deferred to client mount. | Medium | YES (Blocked by Auth) |
| `src/app/(crm)/quotes/QuotesClient.tsx` | `QuotesClient` | **POTENTIAL** Money and date formatting for quotes might mismatch server locale vs client locale if not standardized. | Medium | YES (Blocked by Auth) |
| `src/app/(crm)/dashboard/DashboardClient.tsx` | `DashboardClient` | **POTENTIAL** Charts and metrics frequently use client dimensions or local dates which mismatch SSR. | Medium | YES (Blocked by Auth) |

## Hydration General Mitigation
Where hydration issues are confirmed at runtime:
1. Wrap browser-only data in a `useEffect` to ensure it only renders post-mount.
2. Use a generic `<ClientOnly>` wrapper for timezone/locale specific dates.
3. For RSC Date passing, ensure dates are standardized (e.g., ISO strings) before locale formatting.

## Status
- **PriceBooks Defect**: Confirmed defect (React #418/#441), runtime root cause unvalidated.
- **Other pages**: Full UI regression blocked by authentication.
