# PHASE 31 — ARCHITECTURE DEPENDENCY MAP

## Objective
Map architectural coupling to external services and infrastructure to highlight critical integration points that future changes must preserve.

## Dependency Classifications
**A.** CORE CONTRACT (Irreplaceable without a fundamental application rewrite)
**B.** INFRASTRUCTURE IMPLEMENTATION (Replaceable, but deeply tied to deployment topology)
**C.** EXTERNAL PROVIDER (Replaceable 3rd party service)
**D.** REGION-SPECIFIC ASSUMPTION (Geographic requirement)
**E.** TEMPORARY/LEGACY (Technical debt to be resolved)

---

### 1. Prisma ORM
- **Classification:** **A. CORE CONTRACT**
- **Coupling:** The entire data access layer, interactive transactions (`prisma.$transaction`), Optimistic Concurrency Control (OCC), and typescript entity typing are strictly bound to Prisma. 
- **Future Change Rule:** Replacing Prisma requires an exhaustive rewrite of `customer.service.ts` transaction semantics, the OCC retry loops, and the schema-driven Zod validations.

### 2. Supabase / PostgreSQL (PgBouncer)
- **Classification:** **B. INFRASTRUCTURE IMPLEMENTATION**
- **Coupling:** The connection string heavily relies on the Supabase Pooler (`pooler.supabase.com:6543`) to multiplex Serverless connections via PgBouncer. 
- **Future Change Rule:** If migrating to a non-pooled Postgres provider (e.g., standard AWS RDS), the application will instantly exhaust database connections under Vercel Serverless loads unless Prisma Accelerate or a dedicated proxy is introduced.

### 3. Vercel Execution Region (`sin1`)
- **Classification:** **D. REGION-SPECIFIC ASSUMPTION**
- **Coupling:** To prevent ~8-10 second transactional latency penalties, the Vercel function execution environment is explicitly locked to `sin1` to colocate with the Singapore database.
- **Future Change Rule:** Do not change `vercel.json` without simultaneously migrating the database. Changing regions requires a mandatory clean load test to verify latency.

### 4. Clerk Authentication
- **Classification:** **C. EXTERNAL PROVIDER**
- **Coupling:** Bound via Next.js middleware, React `useUser` hooks, and server-side `auth()` resolution.
- **Future Change Rule:** Replacing Clerk requires a complete overhaul of the `middleware.ts` protection boundary and the authoritative injection of the `userId` into Server Actions.

### 5. EventOutbox / Vercel Cron
- **Classification:** **B. INFRASTRUCTURE IMPLEMENTATION**
- **Coupling:** Asynchronous processing relies on Vercel's Cron scheduler triggering `/api/cron/process-outbox`.
- **Future Change Rule:** Migrating off Vercel requires configuring a new reliable event dispatcher (like AWS EventBridge or native cron) to ping the Outbox endpoint, otherwise all async side effects will permanently halt.

### 6. Stripe, Resend, Twilio, Gemini
- **Classification:** **C. EXTERNAL PROVIDER**
- **Coupling:** Standard REST/SDK API interfaces.
- **Future Change Rule:** Safely replaceable. Ensure new synchronous provider calls handle connection timeouts explicitly to prevent hanging Server Actions.
