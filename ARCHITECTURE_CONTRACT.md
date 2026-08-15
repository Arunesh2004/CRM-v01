# ARCHITECTURE CONTRACT

**Future development may change implementation details, providers, infrastructure, or architecture, provided the following contracts remain true.**

This document defines the non-negotiable architectural invariants of the AI-Security-CRM-SaaS project. Any feature that violates these invariants is categorically rejected.

## 1. Authentication Invariants
- Unauthenticated requests must categorically fail to access protected operations or resources.
- The authoritative `userId` must strictly derive from the secure server-side session token (Clerk), never from client-provided JSON payloads.
- Production environments must never contain active test-authentication bypasses or mocked JWT verification.

## 2. Tenant Isolation Invariants
- Every mutative action must explicitly resolve the current user's `tenantId` server-side via the database, mapped against their authoritative `userId`.
- Client-provided identifiers for `tenantId` must never be trusted for authorization or read-scoping.
- Background jobs (Cron) must explicitly target specific tenants or operate safely as global maintenance routines.

## 3. Authorization Invariants
- Authorization (RBAC) must occur entirely server-side.
- The UI layer may toggle visibility based on roles, but the Server Action must independently re-verify the role.
- Destructive/mutative operations require definitive validation of `ADMIN` or `MEMBER` roles.

## 4. Database Integrity Invariants
- Multi-table writes must occur inside an interactive transaction to prevent partial state corruption.
- Read-modify-write operations on high-contention resources must utilize Optimistic Concurrency Control (OCC).
- Queries must enforce soft-delete boundaries (`where: { deletedAt: null }`).
- Application-level schema changes must be fully reversible or documented via explicit migration strategies.

## 5. Security & Availability Invariants
- Sensitive secrets must never enter source control.
- Detailed Prisma database error strings must be sanitized before reaching the client UI.
- Volumetric endpoints require strict rate-limiting.
- Unbounded queries on growing tables must enforce `limit` boundaries.

## 6. Infrastructure & Topology Invariants
- Vercel Serverless Function execution environments must remain explicitly geographically colocated with the Supabase Database cluster (currently `sin1` / Singapore) to prevent catastrophic latency.
- External API calls (AI, Billing, Email) must fail gracefully with strict timeout bounds so they do not exhaust Serverless execution durations.

## 7. Async & Event Invariants
- Outbox processing must adhere to strict at-least-once transactional commit guarantees.
- AI contextual pipelines must strictly map generated prompts to the isolated `tenantId`.
