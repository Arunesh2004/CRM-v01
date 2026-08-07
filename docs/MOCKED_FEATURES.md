# Mocked Features

**Date**: 2026-08-06

## 1. AI Assistant
* **Feature**: `askAssistant` (Prompt Processing)
* **Evidence**: The integration script executed the `askAssistant()` entry point. The server generated the log: `{"level":"info","message":"[MOCK AI] Received prompt:"}` and returned a static string instead of initiating a network call to OpenAI or Google GenAI.
* **Provider**: Local Static String Mock.
* **Why**: The LLM integration SDK was never implemented by the developers.
* **Production Replacement**: Integrate `@google/genai` API SDK inside `src/modules/ai/assistant.service.ts`.
