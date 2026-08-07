# Production Gap Analysis

**Date**: 2026-08-06

## 1. Automated Testing Blocker
* **Gap**: The production auth relies on Clerk Bot Protection, preventing headless UI CI/CD testing.
* **Remediation**: Establish a dedicated staging environment where Bot Protection is disabled, or whitelist CI/CD IP ranges in the IdP console.

## 2. Advanced Feature Reality
* **Gap**: The platform advertises capabilities (Live CCTV, VoIP) that simply do not exist in the service layer AST. The AI Assistant exists but intercepts queries to return static mock strings.
* **Remediation**: Build the RTSP ingestion microservice. Integrate the `LiveKit` WebRTC server. Implement `@google/genai` inside `src/modules/ai/assistant.service.ts`.

## 3. Database Syntax Quality
* **Gap**: Core backend insertion workflows (Incident generation, Billing queries) crash instantly due to fundamental Prisma typing and relation syntax errors.
* **Remediation**: Correct the `incident.service.ts` schema logic to use `connect: { id }` relations instead of invalid `.create()` properties. Add Jest unit testing to catch these baseline failures.
