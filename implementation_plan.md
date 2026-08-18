# Phase 9: AI Platform & Automation Engine

## Goal Description
Build the enterprise AI platform layer on top of the secured CRM, featuring Context Engines, RAG with `pgvector`, Memory Systems, Workflow Automation, and AI Observability.

## Proposed Changes

### Database Layer
#### [MODIFY] [schema.prisma](file:///c:/Users/Administrator/.gemini/antigravity-ide/scratch/AI-Security-CRM-SaaS/database/schema.prisma)
- Enable `postgresqlExtensions` preview feature and add `extensions = [vector]`.
- Add `DocumentEmbedding` model with fields: `id`, `tenantId`, `documentId`, `accessLevel`, `departmentId`, `createdById`, `chunkText`, `metadata`, `createdAt`, and `embedding` (`Unsupported("vector(1536)")`).
- Add `DocumentPermission` model (Fields: `id`, `documentId`, `userId`, `roleId`, `permission`, `createdAt`).
- Add `AIMemory` model (Fields: `id`, `tenantId`, `userId`, `type` (memoryType), `visibility` (PRIVATE_USER, DEPARTMENT, TENANT), `content`, `embedding`, `importanceScore`, `source`, `verified` (Boolean), `approvedBy` (String?), `expiresAt`, `createdAt`).
- Add `AIAgentExecution` model (Fields: `id`, `tenantId`, `userId`, `agentName`, `correlationId`, `status`, `input`, `output`, `createdAt`, `updatedAt`).
- Add `Workflow`, `WorkflowTrigger`, `WorkflowAction`, `WorkflowExecution`, and `WorkflowExecutionStep` (Fields: `id`, `executionId`, `actionId`, `status`, `result`, `error`, `timestamp`).
- Add `AITokenUsage` model for observability (Fields: `id`, `tenantId`, `userId`, `model`, `inputTokens`, `outputTokens`, `latencyMs`, `cost`, `workflowId`, `aiExecutionId`, `timestamp`).
- Add `AIProviderConfig` model (Fields: `id`, `tenantId`, `provider`, `model`, `encryptedApiKey`, `isActive`, `createdAt`).

### AI Context Engine
#### [NEW] [context-builder.service.ts](file:///c:/Users/Administrator/.gemini/antigravity-ide/scratch/AI-Security-CRM-SaaS/src/modules/ai/context/context-builder.service.ts)
- Implement `UserContextBuilder` to aggregate user RBAC, tenant context, and permitted modules to enforce strict LLM scoping.

### AI Provider Abstraction
#### [NEW] [src/modules/ai/providers/](file:///c:/Users/Administrator/.gemini/antigravity-ide/scratch/AI-Security-CRM-SaaS/src/modules/ai/providers/)
- Introduce an abstraction layer to support future providers (OpenAI, Gemini, Claude) mapped to `AIProviderConfig`.

### RAG Foundation
#### [NEW] [embedding.service.ts](file:///c:/Users/Administrator/.gemini/antigravity-ide/scratch/AI-Security-CRM-SaaS/src/modules/ai/rag/embedding.service.ts)
- Implement secure, tenant-isolated vector generation and retrieval using `pgvector`.
- **RAG Retrieval strict enforcement**: User Context -> Tenant Filter -> Department Filter -> Document Permission Filter -> Vector Search -> LLM.

### AI Memory System
#### [NEW] [memory.service.ts](file:///c:/Users/Administrator/.gemini/antigravity-ide/scratch/AI-Security-CRM-SaaS/src/modules/ai/memory/memory.service.ts)
- Handle short-term (conversation), long-term (facts), and episodic (decisions) memory management.
- **Memory Anti-Poisoning Flow**: Input -> Validation -> Permission Check -> Storage.

### AI Workflow Engine
#### [NEW] [workflow.service.ts](file:///c:/Users/Administrator/.gemini/antigravity-ide/scratch/AI-Security-CRM-SaaS/src/modules/ai/workflow/workflow.service.ts)
- Handle event triggers, condition evaluations, action executions, and track progress using `WorkflowExecutionStep`.
- Reuse Phase 8 Security: AI Permission Engine, SecurityEvent, AuditLog, and RLS.

### AI Observability
#### [NEW] [token.service.ts](file:///c:/Users/Administrator/.gemini/antigravity-ide/scratch/AI-Security-CRM-SaaS/src/modules/ai/observability/token.service.ts)
- Record token input/output, model usage, latency, and costs to `AITokenUsage`.

## Verification Plan

### Automated Tests
- Create `PHASE-9-AI-VALIDATION-AUDIT.md` and test scripts to verify RAG cross-tenant isolation, AI memory boundaries, workflow escalation prevention, and token tracking accuracy.
- Run `npx prisma validate`, `npx tsc --noEmit`, and `npm run build`.
