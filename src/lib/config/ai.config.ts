/**
 * Core AI execution budget and security configuration.
 * DO NOT scatter arbitrary constants throughout the application.
 */

function getIntEnv(key: string, defaultValue: number, min: number, max: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

export const AIConfig = {
  // Maximum number of rounds Gemini is allowed to loop (Request -> Tools -> Response)
  MAX_TOOL_ROUNDS: getIntEnv('AI_MAX_TOOL_ROUNDS', 5, 1, 10),

  // Absolute maximum number of total tool executions allowed across ALL rounds.
  MAX_TOTAL_TOOL_CALLS: getIntEnv('AI_MAX_TOTAL_TOOL_CALLS', 10, 1, 50),

  // Maximum number of tool calls that can run simultaneously in one round.
  MAX_PARALLEL_TOOL_CALLS: getIntEnv('AI_MAX_PARALLEL_TOOL_CALLS', 3, 1, 10),

  // The maximum size (in bytes/characters) that a single tool result can return to the LLM.
  // 50 KB default
  MAX_TOOL_RESULT_BYTES: getIntEnv('AI_MAX_TOOL_RESULT_BYTES', 51200, 1024, 512000),

  // Absolute maximum context size across the whole conversation window (characters)
  // 500 KB default
  MAX_CONTEXT_BYTES: getIntEnv('AI_MAX_CONTEXT_BYTES', 512000, 10240, 2048000),

  // Maximum wall-clock time allowed for the entire AI orchestrator execution.
  // 15 seconds default
  MAX_EXECUTION_MS: getIntEnv('AI_MAX_EXECUTION_MS', 15000, 1000, 60000),

  // Maximum number of conversation history messages to process.
  MAX_HISTORY_MESSAGES: getIntEnv('AI_MAX_HISTORY_MESSAGES', 10, 0, 50),

  // Maximum character length for a single history message to prevent individual oversized payloads.
  MAX_HISTORY_MSG_CHARS: getIntEnv('AI_MAX_HISTORY_MSG_CHARS', 5000, 100, 20000),

  // Maximum total character length of the entire conversation history.
  MAX_HISTORY_TOTAL_CHARS: getIntEnv('AI_MAX_HISTORY_TOTAL_CHARS', 50000, 1000, 200000),
};
