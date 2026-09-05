import { Resource, Action } from '@prisma/client';
import { ProviderHealth } from '../../../infrastructure/providers/base.interface';

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

  /**
   * Checks the health and configuration status of the AI Provider.
   */
  checkHealth?(): ProviderHealth | Promise<ProviderHealth>;
}

export interface AITool {
  name: string;
  description: string;
  parameters?: Record<string, any>; // JSON schema format for tool arguments
  requiredResource?: Resource;
  requiredAction?: Action;
  execute: (args: any, context?: any) => Promise<any>;
}

// ---------------------------------------------------------------------------
// SUBPHASE B: PROVIDER-NEUTRAL AI ABSTRACTION
// ---------------------------------------------------------------------------

import { AIContext } from '@/modules/ai/context/context-builder.service';

export interface AIToolRequest {
  id: string; // Unique ID for this tool call, returned to provider
  name: string;
  args: unknown; // Provider's arbitrary JSON arguments (must be validated by orchestrator)
}

export interface AIToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

export interface AITurnResult {
  text?: string;
  toolRequests?: AIToolRequest[];
}

export interface AITurnContext {
  prompt: string;
  history?: {role: 'user'|'assistant'|'tool', content: string, toolCallId?: string}[];
  systemInstruction?: string;
  tools: { name: string, description: string, parameters?: any }[];
  requestId?: string;
}

/**
 * A session represents an isolated conversational context with the AI.
 */
export interface AISession {
  /**
   * Processes a single turn of text and returns either text or tool intents.
   * The caller (orchestrator) is responsible for executing any requested tools and feeding the results back.
   */
  processTurn(context: AITurnContext): Promise<AITurnResult>;
  
  /**
   * Submits the results of previously requested tools back to the session.
   */
  submitToolResults(results: AIToolResult[]): Promise<AITurnResult>;
}

/**
 * The core factory contract for the new provider-neutral execution model.
 */
export interface AIEngineProvider {
  /**
   * Creates a new session initialized with the trusted AIContext.
   * The provider treats the context as immutable and uses it for contextual inference,
   * but MUST NOT act as an authorization authority.
   */
  createSession(aiContext: AIContext): AISession;
}
 
