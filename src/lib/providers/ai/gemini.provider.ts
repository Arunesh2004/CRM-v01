import { GoogleGenAI } from '@google/genai';
import { AIProvider, AITool, AIResponse } from './ai-provider.interface';
import { Logger } from '../../logger/logger';
import { AIConfig } from '../../config/ai.config';

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
  }

  async generateResponse(prompt: string, tools: AITool[], systemInstruction?: string, requestId?: string, history?: {role: 'user'|'assistant', content: string}[]): Promise<AIResponse> {
    // Partial telemetry collected before timeout so the caller can still audit.
    let partialTelemetry: Pick<AIResponse, 'toolsRequested' | 'toolsExecuted' | 'rounds' | 'totalToolCalls'> = {
      toolsRequested: [],
      toolsExecuted: [],
      rounds: 0,
      totalToolCalls: 0,
    };

    try {
      const result = await this.executeWithTimeout(
        this.runGenerationLoop(prompt, tools, systemInstruction, requestId, history, partialTelemetry),
        AIConfig.MAX_EXECUTION_MS
      );
      return result;
    } catch (err: any) {
      const msg = err.message || '';
      Logger.error(`[GEMINI] Provider error [${requestId || 'unknown'}]:`, err);

      // Map known budget/error conditions to user-safe text + terminationReason.
      // Partial telemetry is forwarded so the audit log captures what ran before failure.
      if (msg.includes('AI Request Timed Out')) {
        return {
          text: "Sorry, I couldn't complete that request within the allowed processing time.",
          ...partialTelemetry,
          terminationReason: 'TIMEOUT',
        };
      }
      if (msg.includes('TOOL_LIMIT')) {
        return {
          text: "I've hit the maximum number of operations allowed for this request. Please ask a more specific question.",
          ...partialTelemetry,
          terminationReason: 'TOOL_LIMIT',
        };
      }
      if (msg.includes('CONTEXT_LIMIT')) {
        return {
          text: "The information retrieved is too large for me to process. Please narrow your search.",
          ...partialTelemetry,
          terminationReason: 'CONTEXT_LIMIT',
        };
      }
      if (msg.includes('RATE_LIMITED') || msg.includes('429')) {
        return {
          text: "I am receiving too many requests right now. Please try again in a moment.",
          ...partialTelemetry,
          terminationReason: 'ERROR',
        };
      }

      return {
        text: "AI Assistant is temporarily unavailable. Your CRM data is unaffected.",
        ...partialTelemetry,
        terminationReason: 'ERROR',
      };
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('AI Request Timed Out')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  private async runGenerationLoop(
    prompt: string,
    tools: AITool[],
    systemInstruction?: string,
    requestId?: string,
    history?: {role: 'user'|'assistant', content: string}[],
    // Shared mutable telemetry object — updated in-place so partial data
    // is available even if the loop throws (e.g. on timeout).
    telemetry?: Pick<AIResponse, 'toolsRequested' | 'toolsExecuted' | 'rounds' | 'totalToolCalls'>
  ): Promise<AIResponse> {
    const t = telemetry ?? { toolsRequested: [], toolsExecuted: [], rounds: 0, totalToolCalls: 0 };

    const geminiTools = tools.length > 0 ? [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || { type: 'OBJECT', properties: {} }
      }))
    }] : undefined;

    let geminiHistory;
    if (history && history.length > 0) {
      geminiHistory = history.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }));
    }

    const chat = this.ai.chats.create({
      model: this.modelName,
      config: {
        systemInstruction,
        tools: geminiTools as any,
        temperature: 0.1,
      },
      history: geminiHistory
    });

    // Estimate context cost of history
    const historyBytes = history ? history.reduce((acc, curr) => acc + curr.content.length, 0) : 0;
    let totalContextBytes = prompt.length + historyBytes;

    if (totalContextBytes > AIConfig.MAX_CONTEXT_BYTES) {
      throw new Error('CONTEXT_LIMIT');
    }

    let response = await chat.sendMessage({ message: prompt });

    while (t.rounds < AIConfig.MAX_TOOL_ROUNDS) {
      if (response.functionCalls && response.functionCalls.length > 0) {
        // Record tool NAMES requested this round (never args — privacy).
        const requestedNames = response.functionCalls.map(fc => fc.name || '').filter(Boolean);
        t.toolsRequested.push(...requestedNames);

        t.totalToolCalls += response.functionCalls.length;
        if (t.totalToolCalls > AIConfig.MAX_TOTAL_TOOL_CALLS) {
          throw new Error('TOOL_LIMIT');
        }

        const functionResponses: {name: string, response: any}[] = [];

        // Chunk for parallel execution limits
        const chunks: (typeof response.functionCalls)[] = [];
        for (let i = 0; i < response.functionCalls.length; i += AIConfig.MAX_PARALLEL_TOOL_CALLS) {
          chunks.push(response.functionCalls.slice(i, i + AIConfig.MAX_PARALLEL_TOOL_CALLS));
        }

        for (const chunk of chunks) {
          const chunkResponses = await Promise.all(chunk.map(async (call) => {
            const toolName = call.name || '';
            const args = call.args || {};

            Logger.info(`[GEMINI] Model requested tool: ${toolName}`, { requestId });

            const tool = tools.find(t => t.name === toolName);
            let result;

            if (!tool) {
              result = { error: `Tool ${toolName} not found or not authorized.` };
            } else {
              try {
                const toolResult = await tool.execute(args);

                // Safe JSON serialization and truncation to valid structure
                let resultStr = '';
                try {
                  resultStr = JSON.stringify(toolResult);
                } catch(e) {
                  resultStr = String(toolResult);
                }

                if (resultStr.length > AIConfig.MAX_TOOL_RESULT_BYTES) {
                  result = {
                    truncated: true,
                    reason: "RESULT_SIZE_LIMIT",
                    summary: "The result was too large to process safely.",
                    suggestion: "Please narrow the query."
                  };
                } else {
                  // Record execution success (name only — never result payload).
                  t.toolsExecuted.push(toolName);
                  result = toolResult;
                }
              } catch (err: any) {
                Logger.warn(`[GEMINI] Tool ${toolName} failed:`, { error: err.message, requestId });
                // Sanitize error messages before returning to the AI model.
                // Raw Prisma/service errors may contain schema names, field lists, or
                // internal details that should NEVER appear in the AI context window.
                const rawMsg: string = err?.message || '';
                let safeError: string;
                if (rawMsg.includes('Unauthorized') || rawMsg.includes('Forbidden') || rawMsg.includes('Access Denied')) {
                  safeError = 'Access denied. You do not have permission to perform this action.';
                } else if (rawMsg.includes('not found') || rawMsg.includes('Not found')) {
                  safeError = 'The requested record was not found.';
                } else {
                  safeError = 'This tool is temporarily unavailable. Please try again or rephrase your request.';
                }
                result = { error: safeError };
              }
            }

            return { name: toolName, response: result };
          }));

          functionResponses.push(...chunkResponses);
        }

        const payloadStr = JSON.stringify(functionResponses);
        totalContextBytes += payloadStr.length;
        if (totalContextBytes > AIConfig.MAX_CONTEXT_BYTES) {
          throw new Error('CONTEXT_LIMIT');
        }

        // Send function responses back
        response = await chat.sendMessage({ message: functionResponses } as any);
        t.rounds++;
      } else {
        totalContextBytes += (response.text || '').length;
        if (totalContextBytes > AIConfig.MAX_CONTEXT_BYTES) {
          throw new Error('CONTEXT_LIMIT');
        }
        return {
          text: response.text || '',
          toolsRequested: t.toolsRequested,
          toolsExecuted: t.toolsExecuted,
          rounds: t.rounds,
          totalToolCalls: t.totalToolCalls,
          terminationReason: 'COMPLETE',
        };
      }
    }

    throw new Error('Maximum tool iterations exceeded');
  }
}
