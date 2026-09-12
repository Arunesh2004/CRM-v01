# S14-A AI PROVIDER SECURITY AUDIT

## Executive Summary
The AI Provider architecture was audited for security, correctness, and adherence to product principles. An earlier mistake (creating a duplicate provider in `src/modules/ai/providers/`) was identified and reverted, as the repository already contained a fully implemented, robust Gemini provider under `src/lib/providers/ai/`. The Mock AI provider, previously returning fake functionality when credentials were missing, was corrected to safely degrade by throwing an explicit `AI_PROVIDER_NOT_CONFIGURED` error, ensuring zero fake inference or misleading audit logs. 

## Current AI Architecture
The architecture cleanly separates the AI assistant logic from provider implementations:
- `Assistant Service` orchestrates context, rate limits, and tools.
- `AIProviderFactory` (`src/lib/providers/ai/ai-provider.factory.ts`) instantiates the required engine.
- Providers implement standard `AIProvider` or `AIEngineProvider` interfaces.

## Provider Abstraction
The `AIProviderFactory` properly abstracts provider creation. It delegates to the `GeminiEngineProvider` when `GEMINI_API_KEY` is present and the app is not in demo mode. The interface remains stable, and adding a new provider (e.g., Anthropic) only requires implementing `AIEngineProvider` and registering it in the factory without touching the `Assistant Service`.

## Gemini Integration
The official `@google/genai` SDK is used in `src/lib/providers/ai/gemini-engine.provider.ts`. The integration leverages `sendMessage` and structured function declarations, properly interpreting `AIToolResult` submissions. Retry logic with exponential backoff and timeout abort signals handles transient API errors defensively.

## Credential Safety
The `GEMINI_API_KEY` is retrieved purely from `process.env.GEMINI_API_KEY`. It is never exposed to the client, never logged, and only used within the server-side provider instantiation. 

## Safe Degradation
If `GEMINI_API_KEY` is missing, the system falls back to the `MockAIProvider`. Previously, this mock attempted to parse intents with regex and generated fake "success" texts. This was a violation of the safe degradation principle. The `MockAIProvider` was updated to immediately throw an `AI_PROVIDER_NOT_CONFIGURED` error, which the `Assistant Service` catches and converts into a user-safe "temporarily unavailable" message, preventing any fake AI behavior or misleading audit traces.

## AI Authorization
Authorization occurs before any external AI call. The `Assistant Service` filters the tools available to the AI (`authorizedTools`) based on the authenticated user's permissions via `checkPermission(tool.requiredResource, tool.requiredAction)`. The AI can only request tools it was informed about, and `ToolRegistry.executeTool` enforces that execution happens strictly within the authenticated user's context.

## Tenant Isolation
The `AIContext` is built via `ContextBuilderService.buildUserContext(tenantId!, user.id)`. This context is securely passed to the `ToolRegistry`. The AI engine cannot override this context because the tool layer ignores any `tenantId` arguments passed by the model, throwing a Security Violation if attempted. All database access within tools uses the scoped tenant context.

## Prompt Injection Boundaries
Untrusted CRM data (e.g., customer notes, leads) is returned to the model as `AIToolResult` structures. The system prompt explicitly instructs the model to treat CRM data as untrusted and not as system commands. Furthermore, because tool execution itself is rigidly authorized, even if a prompt injection tricks the model into requesting a restricted tool, the request will fail if the user lacks the underlying permission.

## Tool Execution Security
- Tools are categorized.
- Permissions are strictly enforced by `checkPermission` before tools are exposed.
- Identity overrides (`tenantId`, `userId`, `departmentId`) sent by the AI in tool arguments throw a hard error.
- Size limits (`AIConfig.MAX_TOOL_RESULT_BYTES`) prevent massive payloads from crashing the process or breaching token limits.

## AI Audit
The `logAiAudit` function acts as a fire-and-forget telemetry sink. It logs:
- `tenantId`, `actorId`, `requestId`
- Provider metadata (`model`, `durationMs`)
- Tool usage counts
- Error categories (e.g., `TIMEOUT`, `RATE_LIMITED`)
It strictly does NOT log prompts, AI responses, tool results, PII, or API keys. Provider failures are recorded accurately via the `terminationReason` or `errorCategory`.

## Error Handling
The `GeminiEngineProvider` catches `429`, `50X`, and network errors, applying an exponential backoff retry. Non-transient errors bubble up to the `Assistant Service`. The service maps them to categorical telemetry (`PROVIDER_ERROR`, `RATE_LIMITED`) and returns a generic, safe response to the user, ensuring stack traces and internal secrets are never exposed.

## Provider Portability
The architecture remains agnostic. `assistant.service.ts` imports from `ai-provider.factory.ts`, relying only on the generic `AIEngineProvider` and `AITurnContext` interfaces. The SDK-specific code (`GoogleGenAI`) is strictly isolated inside `gemini-engine.provider.ts`.

## Testing
- **TypeScript:** Compiled without error (`npx tsc --noEmit`).
- **ESLint:** Run on modified files without errors.
- **Security Logic:** Safe degradation logic validated conceptually and practically; mock fake inference removed.

## Documentation Corrections
The `docs/S14_CURRENT_PRODUCT_STATE_AUDIT.md` document was corrected to reflect that the AI Provider (Gemini) is indeed fully implemented in the `lib` layer and not missing. The "missing" feature is actually the external Realtime infrastructure required for Internal Calling.

## Production Safety
- **Production database mutated:** NO
- **Vercel environment changed:** NO
- **Credentials exposed:** NO

## Git Status
- `docs/S14-A_AI_PROVIDER_SECURITY_AUDIT.md` (Untracked)
- `docs/S14_CURRENT_PRODUCT_STATE_AUDIT.md` (Modified)
- `src/lib/providers/ai/mock-ai.provider.ts` (Modified)
The duplicate Gemini files in `src/modules/ai/providers` were reverted/deleted.

## Final Decision
### VERIFIED / READY FOR COMMIT
