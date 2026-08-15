# PHASE 31 — ARCHITECTURE BASELINE

## Objective
Establish a formal, verified baseline of the existing CRM architecture to serve as the source of truth for future architectural modifications.

## 1. Frontend & Client Layer
- **Component:** Next.js Server Components and Client Components
- **Responsibility:** Render UI, collect user inputs, maintain client-side state, and handle initial form validation using Zod.
- **Dependencies:** React, Next.js App Router, Clerk `useUser`/`useOrganization`, Vercel Edge caching.
- **Security Boundary:** Trusted to present UI securely, but entirely UNTRUSTED for authorization.
- **Current Known Limitation:** UI cannot securely identify the tenant context in isolation; it must pass metadata to Server Actions.
- **Replaceable:** Yes, provided the new UI accurately submits requests to the authenticated backend.

## 2. API & Server Actions Layer
- **Component:** Next.js Server Actions (e.g., `createCustomerAction`)
- **Responsibility:** Serve as the authoritative ingress point for mutative actions.
- **Dependencies:** `requireTenant()`, `requirePermission()`, Clerk backend SDK, Zod, Prisma Client.
- **Security Boundary:** The primary security boundary. Validates inputs, authenticates requests, resolves the tenant identity on the server, and enforces RBAC.
- **Current Known Limitation:** Heavy sequential reliance on asynchronous read checks.
- **Replaceable:** Yes, could be migrated to API routes or standard GraphQL/REST endpoints, provided the auth/RBAC wrapper is perfectly preserved.

## 3. Authentication Subsystem
- **Component:** Clerk Auth
- **Responsibility:** Authenticate users, manage JWT lifecycle, manage session cookies.
- **Dependencies:** Clerk SDK, Edge Middleware (`middleware.ts`).
- **Security Boundary:** Authoritative source for `userId`.
- **Current Known Limitation:** Testing requires either mocked tokens or active browser sessions.
- **Replaceable:** Yes (e.g., to Auth0/Supabase Auth), provided the edge middleware securely validates tokens and provides an unforgeable `userId`.

## 4. Authorization & Tenant Subsystem
- **Component:** `auth.ts` / `requireTenant()` / `requirePermission()`
- **Responsibility:** Maps an authenticated `userId` to a `tenantId` and verifies the user's role (`ADMIN`, `MEMBER`) against the database.
- **Dependencies:** Prisma Client.
- **Security Boundary:** Authoritative source for `tenantId` and `Role`.
- **Failure Mode:** Fail closed if tenant mapping or role is undefined.
- **Replaceable:** Yes, provided it remains strictly evaluated Server-Side before any mutative action.

## 5. Database & ORM
- **Component:** Prisma ORM & PostgreSQL (Supabase)
- **Responsibility:** Durable storage, referential integrity, optimistic concurrency control (OCC), interactive transactions.
- **Dependencies:** `aws-0-ap-southeast-1.pooler.supabase.com:6543`, PgBouncer (session mode).
- **Security Boundary:** Relies completely on application-level tenant isolation (all queries must explicitly `where: { tenantId }`).
- **Current Known Limitation:** Pooler concurrency limits can be exhausted if Vercel scales horizontally faster than PgBouncer can multiplex.
- **Replaceable:** Yes (e.g., Drizzle ORM, AWS RDS), provided interactive transaction semantics and strict `tenantId` clauses are ported.

## 6. EventOutbox & Async Processing
- **Component:** EventOutbox pattern / Vercel Cron
- **Responsibility:** Guaranteed at-least-once asynchronous execution of side effects (email, external API sync).
- **Dependencies:** Vercel Cron infrastructure, Prisma `eventOutbox` table.
- **Failure Mode:** Safe fallback. Failed events remain pending for future retries.
- **Current Known Limitation:** Vercel Hobby limits cron execution to `0 0 * * *` (once daily).
- **Replaceable:** Yes (e.g., AWS SQS, Upstash Redis Queues), provided transactional outbox commits are maintained.

## 7. AI Subsystem
- **Component:** Vercel AI SDK / Gemini
- **Responsibility:** Tenant-scoped AI contextual analysis.
- **Dependencies:** `@ai-sdk/google`, Google Gemini API Key.
- **Security Boundary:** Relies on application to provide strictly tenant-scoped context to the LLM.
- **Current Known Limitation:** Unverified under load. External provider timeout risks exist.
- **Replaceable:** Yes (e.g., OpenAI, Anthropic).

## 8. Infrastructure Topology
- **Component:** Vercel Edge/Serverless & Supabase Cloud
- **Responsibility:** Hosting application compute and database.
- **Dependencies:** `vercel.json` explicit `"regions": ["sin1"]` setting.
- **Failure Mode:** Severe ~8.5s latency regression if the execution region defaults to `iad1` (USA) while Supabase remains in Singapore.
- **Current Known Limitation:** The application performance is strictly coupled to geographic colocation.
- **Replaceable:** Yes, provided the compute and database instances remain colocated in the exact same physical region.
