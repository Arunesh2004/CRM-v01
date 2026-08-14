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
    this.modelName = process.env.AI_MODEL || 'gemini-3.5-flash';
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
      const abortController = new AbortController();
      const timer = setTimeout(() => abortController.abort(new Error('AI Request Timed Out')), AIConfig.MAX_EXECUTION_MS);

      const result = await this.runGenerationLoop(
        prompt, tools, systemInstruction, requestId, history, partialTelemetry, Date.now(), abortController.signal
      ).finally(() => clearTimeout(timer));
      return result;
    } catch (err: any) {
      const msg = err.message || '';
      Logger.error('AI Provider Failure', err instanceof Error ? err : new Error(String(err?.message ?? 'unknown')), { event: 'AI_PROVIDER_FAILURE', requestId });

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



  private async sendMessageWithRetry(chat: any, payload: any, startTime: number, requestId?: string, signal?: AbortSignal): Promise<any> {
    let attempt = 0;
    while (true) {
      if (signal?.aborted) throw signal.reason || new Error('AI Request Timed Out');

      try {
        if (signal) {
          payload.config = { ...payload.config, abortSignal: signal };
        }
        return await chat.sendMessage(payload);
      } catch (err: any) {
        attempt++;
        const msg = err?.message || '';
        const status = err?.status || err?.response?.status;

        const isTransient =
          msg.includes('429') ||
          msg.includes('500') ||
          msg.includes('502') ||
          msg.includes('503') ||
          msg.includes('504') ||
          msg.includes('fetch failed') ||
          msg.includes('network') ||
          status === 429 ||
          status >= 500;

        if (!isTransient || attempt > AIConfig.GEMINI_MAX_RETRIES) {
          throw err;
        }

        const elapsed = Date.now() - startTime;
        const remaining = AIConfig.MAX_EXECUTION_MS - elapsed;

        let backoff = Math.min(AIConfig.GEMINI_MAX_BACKOFF_MS, AIConfig.GEMINI_INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1));
        backoff += Math.floor(Math.random() * 200);

        if (backoff >= remaining) {
          throw new Error('AI Request Timed Out'); // Abort retry if it breaches absolute deadline
        }

        Logger.warn('AI Retry', { event: 'AI_RETRY', requestId, attempt, maxAttempts: AIConfig.GEMINI_MAX_RETRIES, delayMs: backoff, errorCategory: msg });
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }

  private async runGenerationLoop(
    prompt: string,
    tools: AITool[],
    systemInstruction?: string,
    requestId?: string,
    history?: {role: 'user'|'assistant', content: string}[],
    telemetry?: Pick<AIResponse, 'toolsRequested' | 'toolsExecuted' | 'rounds' | 'totalToolCalls'>,
    startTime: number = Date.now(),
    signal?: AbortSignal
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

    const historyBytes = history ? history.reduce((acc, curr) => acc + curr.content.length, 0) : 0;
    let totalContextBytes = prompt.length + historyBytes;

    if (totalContextBytes > AIConfig.MAX_CONTEXT_BYTES) {
      throw new Error('CONTEXT_LIMIT');
    }

    let response = await this.sendMessageWithRetry(chat, { message: prompt }, startTime, requestId, signal);

    while (t.rounds < AIConfig.MAX_TOOL_ROUNDS) {
      if (response.functionCalls && response.functionCalls.length > 0) {
        const requestedNames = response.functionCalls.map((fc: any) => fc.name || '').filter(Boolean);
        t.toolsRequested.push(...requestedNames);

        t.totalToolCalls += response.functionCalls.length;
        if (t.totalToolCalls > AIConfig.MAX_TOTAL_TOOL_CALLS) {
          Logger.warn('AI Tool Limit Reached', { event: 'AI_TOOL_LIMIT_REACHED', requestId, limitType: 'MAX_TOTAL_TOOL_CALLS', observedCount: t.totalToolCalls, configuredLimit: AIConfig.MAX_TOTAL_TOOL_CALLS });
          throw new Error('TOOL_LIMIT');
        }

        const functionResponses: {name: string, response: any}[] = [];

        const chunks: (typeof response.functionCalls)[] = [];
        for (let i = 0; i < response.functionCalls.length; i += AIConfig.MAX_PARALLEL_TOOL_CALLS) {
          chunks.push(response.functionCalls.slice(i, i + AIConfig.MAX_PARALLEL_TOOL_CALLS));
        }

        for (const chunk of chunks) {
          const chunkResponses = await Promise.all(chunk.map(async (call: any) => {
            const toolName = call.name || '';
            const args = call.args || {};

            Logger.info('AI Tool Started', { event: 'AI_TOOL_STARTED', requestId, toolName });

            const tool = tools.find(t => t.name === toolName);
            let result;

            if (!tool) {
              result = { error: `Tool ${toolName} not found or not authorized.` };
            } else {
              try {
                const toolStartTime = Date.now();
                const toolResult = await tool.execute(args);
                const toolDuration = Date.now() - toolStartTime;

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
                  t.toolsExecuted.push(toolName);
                  result = toolResult;
                  Logger.info('AI Tool Completed', { event: 'AI_TOOL_COMPLETED', requestId, toolName, durationMs: toolDuration });
                }
              } catch (err: any) {
                Logger.error('AI Tool Failed', err instanceof Error ? err : new Error(String(err?.message ?? 'unknown')), { event: 'AI_TOOL_FAILED', requestId, toolName });
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

        response = await this.sendMessageWithRetry(chat, { message: functionResponses } as any, startTime, requestId, signal);
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
