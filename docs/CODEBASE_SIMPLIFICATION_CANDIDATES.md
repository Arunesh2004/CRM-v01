# CODEBASE SIMPLIFICATION CANDIDATES

## 1. Executive Summary
This document provides a read-only analysis identifying genuine opportunities to simplify the CRM codebase, reduce verbosity, and consolidate semantic duplicates without removing functionality. **NO SOURCE CODE WAS MODIFIED DURING THIS ANALYSIS.** 

## 2. Duplicate Logic Findings
- **Repeated Tenant Resolution Layers:** Certain services may independently check `await getCurrentTenantContext()` and assert values, while others wrap operations inside `withTenant(tenantId)`. This logic is semantically identical across CRM domains but repeatedly implemented.
  - *Proposed Simplification:* Centralize the tenant-aware context retrieval into the data access layer natively, preventing service-level repetition.
  - *Risk:* HIGH (Affects tenant boundary).

## 3. Verbosity Findings
- **Over-Verbose Prisma Object Construction:** Multiple files (e.g., `src/modules/crm/deal/deal.service.ts`) construct massive `include` and `select` trees explicitly in every function, even when fetching the exact same domain entity model for different read operations.
  - *Proposed Simplification:* Extract standard projection constants (e.g., `dealWithCustomerInclude`) and reference them. 
  - *Risk:* LOW/MEDIUM.

## 4. Abstraction Findings
- **Unnecessary Helper Layers in UI:** Components wrapping basic shadcn/ui primitives with solely a `className` override and no semantic purpose. 
  - *Proposed Simplification:* Replace thin wrapper components with direct Tailwind utilities on the base primitives where feasible, unless the wrapper enforces a global design token.
  - *Risk:* LOW.

## 5. Prisma/Query Findings
- **Repetitive Error Mapping:** Repetitive try/catch blocks that capture `PrismaClientKnownRequestError` and map codes (like `P2002`) to `HttpException`.
  - *Proposed Simplification:* A centralized Prisma error interceptor or standardized higher-order function for server actions.
  - *Risk:* MEDIUM.

## 6. React/UI Findings
- **Duplicate Loading Skeletons:** Identical table skeleton loaders re-implemented locally in `CustomerTable.tsx`, `LeadTable.tsx`, and `IncidentClientTable.tsx`.
  - *Proposed Simplification:* Extract to `<GenericTableSkeleton columns={N} rows={M} />`.
  - *Risk:* LOW.

## 7. Service/Server-Action Findings
- **`src/modules/ai/tools/ai.tools.ts`**: The 599-line file orchestrates multiple discrete AI tools (e.g., parsing, formatting, tool definitions) into a single module, repeating identical schema-validation paradigms.
  - *Proposed Simplification:* Introduce a factory function that generates the AI tool definitions automatically from Zod schemas instead of manually writing the Zod schema and then the Langchain/AI tool description separately.
  - *Risk:* MEDIUM.

## 8. Dependency Findings
- **`tw-animate-css`**: Unknown integration, Keep.
- **`recharts`**: Confirmed required for reporting cards. Keep.
- **`pdf-lib`**: Confirmed required for document generation. Keep.

## 9. Security Impact
Any consolidation touching tenant resolution, authentication, or middleware (Candidate Group High-Risk) inherently jeopardizes strict isolation if the shared utility is too generic or introduces fail-open states. 

## 10. Candidate List

| ID | Category | Description | Proposed | Est. Benefit | Risk | Security Impact | Confidence |
|---|---|---|---|---|---|---|---|
| C1 | Prisma | Extract `deal` default projections | Create `const defaultDealSelect` | High (reduces lines in deal.service) | LOW | None | HIGH |
| C2 | React | Consolidate Table Skeletons | Create `<TableSkeleton />` | Medium | LOW | None | HIGH |
| C3 | Server | Centralize Prisma Error Mapping | Higher Order `withErrorHandling` | High (reduces try/catch boilerplate) | MEDIUM | None | HIGH |
| C4 | AI | Simplify AI Tool Definitions | Dynamic tool factory from Zod | High (shrinks `ai.tools.ts`) | MEDIUM | None | MEDIUM |
| C5 | Auth | Unify Tenant Resolution | Shared robust middleware | Low | HIGH | YES | LOW |

## 11. Candidates Explicitly Rejected
- **`C5 (Unify Tenant Resolution)`**: Explicitly rejected. Security boundaries and tenant resolution should remain explicit in their respective service domains to prevent accidental exposure via over-abstraction.

## 12. Candidates Requiring HIGH-RISK Review
- Any consolidation of Server Actions that changes how `auth()` or `getCurrentTenant()` is evaluated. 

## 13. Recommended Candidate Group A
**CANDIDATE GROUP A** (Safest, highest-confidence semantic simplifications):
- **C1**: Extracting Prisma default select/include projection constants in `deal.service.ts` to reduce object initialization verbosity.
- **C2**: Consolidating duplicated React table loading skeletons in CRM views.

## 14. Estimated Maintainability Benefit
Implementing Candidate Group A will reduce repetitive boilerplate in data-access layers and UI loading states, improving readability and reducing file length without abstracting away any business logic or security boundaries.

## 15. Files NOT to touch
- `src/middleware.ts`
- `database/migrations/*`
- `src/lib/auth/*`
- `src/lib/tenant-context.ts`
- Any production configuration.

---
> NO SOURCE CODE WAS MODIFIED DURING THIS ANALYSIS.
