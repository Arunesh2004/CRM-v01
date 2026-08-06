# AI Assistant Plan

## Current AI Readiness
- The platform currently has fully isolated, functional modules for CRM, Incidents, Cameras, Billing, and Reporting.
- The `reporting.service.ts` provides a robust foundation of functions that aggregate metrics accurately based on the current tenant context.
- There are no existing OpenAI/Gemini SDKs installed yet, so we will implement an abstract `AIProvider` that handles the core request flow.

## Provider Strategy
- We will build an `AIProvider` interface.
- For `APP_MODE=demo`, we will use a `MockAIProvider` that intercepts common intent queries ("incidents", "customers", "billing") and responds using data retrieved directly via secure function calls (tools).
- For production, a `GeminiProvider` or `OpenAIProvider` can be written to conform to this interface and call the same tools.

## Security Design
The critical architectural requirement is that the AI never runs raw SQL or directly queries Prisma.
Instead, it will use a **Secure Tool Layer**:
1. User types prompt -> `Assistant.service.ts`
2. Assistant parses intent and decides to call a tool (e.g. `getIncidentSummary()`)
3. The tool internally calls `requireTenant()` and queries the database via our secure `reporting.service.ts`.
4. The exact, scoped metric is returned to the AI.
5. AI synthesizes a response.
Because `tenantId` is always derived strictly from `requireTenant()` within the tool execution, the AI literally cannot access another tenant's data even if hallucinating or prompted maliciously.

## Demo Approach
- Create a realistic mock implementation of the tool execution loop.
- Simple keyword matching to determine which tool to execute (e.g., if "incident" in query -> call `getIncidentSummary`).
- Format the returned tool data into a conversational string.

## Production Upgrade Path
- Connect a real LLM (like `google/gemini-pro`) using function calling (tools) and pass the secure tool schema to it. The tools themselves do not need to change.
