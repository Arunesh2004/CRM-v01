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

  // --- AI.4.3 CONVERSATION BOUNDS & HARDENING ---

  // Maximum number of messages a single conversation can hold.
  MAX_MESSAGES_PER_CONVERSATION: getIntEnv('AI_MAX_MESSAGES_PER_CONVERSATION', 50, 10, 200),

  // Maximum size (bytes) of all content in a single conversation.
  MAX_CONVERSATION_SIZE_BYTES: getIntEnv('AI_MAX_CONVERSATION_SIZE_BYTES', 500000, 100000, 2000000),

  // Maximum size (bytes) of a single user message.
  MAX_MESSAGE_SIZE_BYTES: getIntEnv('AI_MAX_MESSAGE_SIZE_BYTES', 5000, 1000, 50000),

  // Maximum number of conversations to return in list operations.
  MAX_CONVERSATION_LIST_LIMIT: getIntEnv('AI_MAX_CONVERSATION_LIST_LIMIT', 50, 10, 100),

  // --- AI.4.4 CONVERSATION RETENTION & ARCHIVAL ---

  // Days of inactivity before a conversation becomes ARCHIVED
  ARCHIVE_AFTER_DAYS: getIntEnv('AI_ARCHIVE_AFTER_DAYS', 30, 1, 365),

  // Days after archival before a conversation becomes eligible for physical deletion
  RETENTION_DAYS: getIntEnv('AI_RETENTION_DAYS', 90, 7, 730),

  // Maximum rows updated/deleted per cron execution query
  RETENTION_BATCH_SIZE: getIntEnv('AI_RETENTION_BATCH_SIZE', 100, 10, 1000),

  // Maximum batches per cron execution
  RETENTION_MAX_BATCHES_PER_RUN: getIntEnv('AI_RETENTION_MAX_BATCHES_PER_RUN', 5, 1, 50),

  // Safe-mode toggle (default true in non-production or configurable)
  RETENTION_DRY_RUN: process.env.AI_RETENTION_DRY_RUN !== 'false',

  // --- AI.4.1 DISTRIBUTED CONCURRENCY & RATE LIMITING ---

  // Maximum active AI requests allowed concurrently per user globally.
  MAX_CONCURRENT_PER_USER: getIntEnv('AI_MAX_CONCURRENT_PER_USER', 3, 1, 10),

  // Maximum active AI requests allowed concurrently per tenant globally.
  MAX_CONCURRENT_PER_TENANT: getIntEnv('AI_MAX_CONCURRENT_PER_TENANT', 10, 1, 50),

  // Requests allowed per user per minute globally.
  USER_REQUESTS_PER_MINUTE: getIntEnv('AI_USER_REQUESTS_PER_MINUTE', 10, 1, 100),

  // Requests allowed per tenant per minute globally.
  TENANT_REQUESTS_PER_MINUTE: getIntEnv('AI_TENANT_REQUESTS_PER_MINUTE', 50, 1, 500),

  // Buffer in MS added to MAX_EXECUTION_MS to determine distributed lock TTL.
  // E.g. 15000ms + 5000ms = 20000ms (20s) absolute TTL.
  LOCK_TTL_BUFFER_MS: getIntEnv('AI_LOCK_TTL_BUFFER_MS', 5000, 1000, 15000),

  // --- AI.4.1 REDIS FAILURE FALLBACK ---

  // If Redis fails, fall back to this local rate limit (per user per minute).
  FALLBACK_REQUESTS_PER_MINUTE: getIntEnv('AI_FALLBACK_REQUESTS_PER_MINUTE', 5, 1, 20),

  // If Redis fails, fall back to this local concurrency limit.
  FALLBACK_MAX_CONCURRENT: getIntEnv('AI_FALLBACK_MAX_CONCURRENT', 2, 1, 5),

  // --- AI.4.1 GEMINI RETRY SETTINGS ---

  // Maximum number of times to retry a transient provider failure (429, 500, etc)
  GEMINI_MAX_RETRIES: getIntEnv('AI_GEMINI_MAX_RETRIES', 3, 0, 5),

  // The initial backoff in MS before the first retry (exponentially doubled with jitter)
  GEMINI_INITIAL_BACKOFF_MS: getIntEnv('AI_GEMINI_INITIAL_BACKOFF_MS', 500, 100, 2000),

  // The absolute maximum backoff MS per attempt
  GEMINI_MAX_BACKOFF_MS: getIntEnv('AI_GEMINI_MAX_BACKOFF_MS', 5000, 1000, 10000),
};
