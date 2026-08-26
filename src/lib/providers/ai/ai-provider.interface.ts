import { Resource, Action } from '@prisma/client';

/**
 * Structured response returned by every AI provider.
 * Contains the generated text PLUS provider-level execution telemetry
 * so the calling orchestrator can write a privacy-safe audit entry.
 *
 * PRIVACY CONTRACT:
 * - toolsRequested / toolsExecuted contain ONLY tool NAMES (never args, never results).
 * - No prompt content, no CRM field values, no PII of any kind.
 */
export interface AIResponse {
  /** The final text output from the model. */
  text: string;

  /**
   * Names of the tools that the model requested to call.
   * Populated even if the tool ultimately failed or was unauthorized.
   */
  toolsRequested: string[];

  /**
   * Names of the tools whose execute() function was actually invoked.
   * A tool may be requested but not executed (e.g. not found/authorized).
   */
  toolsExecuted: string[];

  /** Number of tool-call rounds that occurred. */
  rounds: number;

  /** Total individual tool invocations across all rounds. */
  totalToolCalls: number;

  /**
   * How execution ended:
   * - COMPLETE      : Model produced a final text response normally.
   * - TOOL_LIMIT    : Halted by MAX_TOTAL_TOOL_CALLS budget.
   * - CONTEXT_LIMIT : Halted by MAX_CONTEXT_BYTES budget.
   * - TIMEOUT       : Halted by MAX_EXECUTION_MS wall-clock deadline.
   * - ERROR         : An unexpected provider-level error occurred.
   */
  terminationReason: 'COMPLETE' | 'TOOL_LIMIT' | 'CONTEXT_LIMIT' | 'TIMEOUT' | 'ERROR';
}

export interface AIProvider {
  /**
   * Generates a response from the AI model, potentially executing tools
   * along the way. The AI Provider should NOT be responsible for tenant context;
   * it just executes the function signatures given.
   *
   * Returns a structured AIResponse so the orchestrator can audit execution
   * without the provider ever touching Prisma or tenant identity.
   */
  generateResponse(
    prompt: string,
    tools: AITool[],
    systemInstruction?: string,
    requestId?: string,
    history?: {role: 'user'|'assistant', content: string}[]
  ): Promise<AIResponse>;

  /**
   * Transcribes and summarizes an audio file in one pass.
   * Expected to return JSON structure containing transcript, summary, and sentiment.
   */
  transcribeAudio?(
    filePath: string,
    mimeType: string,
    prompt?: string
  ): Promise<{ transcript: string; summary: string; sentiment: string }>;
}

export interface AITool {
  name: string;
  description: string;
  parameters?: Record<string, any>; // JSON schema format for tool arguments
  requiredResource?: Resource;
  requiredAction?: Action;
  execute: (args: any) => Promise<any>;
}
