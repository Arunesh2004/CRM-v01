import { GoogleGenAI } from '@google/genai';
import { AIProvider, AITool } from './ai-provider.interface';
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

  async generateResponse(prompt: string, tools: AITool[], systemInstruction?: string, requestId?: string): Promise<string> {
    try {
      return await this.executeWithTimeout(this.runGenerationLoop(prompt, tools, systemInstruction, requestId), AIConfig.MAX_EXECUTION_MS);
    } catch (err: any) {
      const msg = err.message || '';
      Logger.error(`[GEMINI] Provider error [${requestId || 'unknown'}]:`, err);

      if (msg.includes('AI Request Timed Out')) {
        return "Sorry, I couldn't complete that request within the allowed processing time.";
      }
      if (msg.includes('TOOL_LIMIT')) {
        return "I've hit the maximum number of operations allowed for this request. Please ask a more specific question.";
      }
      if (msg.includes('CONTEXT_LIMIT')) {
        return "The information retrieved is too large for me to process. Please narrow your search.";
      }
      if (msg.includes('RATE_LIMITED') || msg.includes('429')) {
        return "I am receiving too many requests right now. Please try again in a moment.";
      }

      return "AI Assistant is temporarily unavailable. Your CRM data is unaffected.";
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
    history?: {role: 'user'|'assistant', content: string}[]
  ): Promise<string> {
    const geminiTools = tools.length > 0 ? [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: 'OBJECT', properties: {} }
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
    let rounds = 0;
    let totalToolCalls = 0;

    while (rounds < AIConfig.MAX_TOOL_ROUNDS) {
      if (response.functionCalls && response.functionCalls.length > 0) {
        totalToolCalls += response.functionCalls.length;
        if (totalToolCalls > AIConfig.MAX_TOTAL_TOOL_CALLS) {
          throw new Error('TOOL_LIMIT');
        }

        const functionResponses: {name: string, response: any}[] = [];

        // Chunk for parallel execution limits
        const chunks = [];
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
                  // Pass valid object to Gemini
                  result = toolResult;
                }
              } catch (err: any) {
                Logger.warn(`[GEMINI] Tool ${toolName} failed:`, { error: err.message, requestId });
                result = { error: err.message };
              }
            }

            return {
              name: toolName,
              response: result
            };
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
        rounds++;
      } else {
        totalContextBytes += (response.text || '').length;
        if (totalContextBytes > AIConfig.MAX_CONTEXT_BYTES) {
          throw new Error('CONTEXT_LIMIT');
        }
        return response.text || '';
      }
    }

    throw new Error('Maximum tool iterations exceeded');
  }
}
