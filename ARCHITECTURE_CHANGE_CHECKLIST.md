# MANDATORY ARCHITECTURE CHANGE CHECKLIST

This checklist must be utilized by all future developers, AI agents, or automated systems prior to merging a major architectural or infrastructure modification into the `main` or `production` branch.

## 1. Context & Scope
- [ ] What architectural invariant is affected?
- [ ] What infrastructure dependency is changing?
- [ ] What external third-party providers are changing?

## 2. Security & Boundaries
- [ ] Does this change modify or bypass the `requireTenant()` check? *(If yes, STOP and explicitly re-verify multi-tenant isolation).*
- [ ] Does this change modify the Clerk authentication middleware or role definitions? *(If yes, verify RBAC).*
- [ ] Are new secrets properly masked from client bundles and committed safely to environment managers instead of source control?

## 3. Data Integrity & Concurrency
- [ ] Are interactive database modifications (`prisma.$transaction`) properly enclosed to prevent partial writes?
- [ ] Does this change bypass Prisma OCC (`version` field tracking) for high-contention read-modify-write loops?
- [ ] Are soft-deleted records (`deletedAt != null`) safely excluded from new queries?
- [ ] What database migration is required, and what is the rollback strategy if it locks production?

## 4. Performance & Infrastructure Constraints
- [ ] **REGION CHECK:** Does this change misalign Vercel Serverless execution (`sin1`) with the Database cluster location? *(If yes, expect massive latency regressions).*
- [ ] Do new database queries use `limit`/`take` boundaries to prevent memory exhaustion on large datasets?
- [ ] Do new synchronous external API calls implement strict timeouts and failure handling?

## 5. Required Minimum Validations
- [ ] `npx tsc --noEmit` completes successfully.
- [ ] `npx prisma validate` and `npx prisma generate` complete successfully.
- [ ] `npm run build` completes without warning or errors.
- [ ] Appropriate regression gates from the Architecture Change Regression Matrix have been executed.
