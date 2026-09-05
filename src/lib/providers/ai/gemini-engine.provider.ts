import { GoogleGenAI } from '@google/genai';
import { AIEngineProvider, AISession, AITurnContext, AIToolResult, AITurnResult } from './ai-provider.interface';
import { AIContext } from '@/modules/ai/context/context-builder.service';
import { Logger } from '../../logger/logger';
import { AIConfig } from '../../config/ai.config';

export class GeminiEngineProvider implements AIEngineProvider {
  private ai?: GoogleGenAI;
  private modelName: string;
  private isConfigured: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.isConfigured = !!apiKey;
    if (this.isConfigured) {
      this.ai = new GoogleGenAI({ apiKey: apiKey! });
    }
    this.modelName = process.env.AI_MODEL || 'gemini-3.5-flash';
  }

  createSession(aiContext: AIContext): AISession {
    if (!this.ai) {
      throw new Error('GeminiProvider is unavailable: GEMINI_API_KEY is missing.');
    }

    Object.freeze(aiContext);
    let chat: any = null;
    const aiClient = this.ai;
    const model = this.modelName;

    const sendMessageWithRetry = async (payload: any, requestId?: string): Promise<any> => {
      let attempt = 0;
      while (true) {
        try {
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

          let backoff = Math.min(AIConfig.GEMINI_MAX_BACKOFF_MS, AIConfig.GEMINI_INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1));
          backoff += Math.floor(Math.random() * 200);

          Logger.warn('AI Retry', { event: 'AI_RETRY', requestId, attempt, maxAttempts: AIConfig.GEMINI_MAX_RETRIES, delayMs: backoff });
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    };

    return {
      async processTurn(context: AITurnContext): Promise<AITurnResult> {
        const geminiTools = context.tools.length > 0 ? [{
          functionDeclarations: context.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters || { type: 'OBJECT', properties: {} }
          }))
        }] : undefined;

        let geminiHistory;
        if (context.history && context.history.length > 0) {
          geminiHistory = context.history.map(h => ({
            role: h.role === 'assistant' || h.role === 'tool' ? 'model' : 'user',
            parts: [{ text: h.content }]
          }));
        }

        // Initialize chat on first turn
        if (!chat) {
          chat = aiClient.chats.create({
            model: model,
            config: {
              systemInstruction: context.systemInstruction,
              tools: geminiTools as any,
              temperature: 0.1,
            },
            history: geminiHistory ?? [],
          });
        }

        const response = await sendMessageWithRetry({ message: context.prompt }, context.requestId);
        
        if (response.functionCalls && response.functionCalls.length > 0) {
          const toolRequests = response.functionCalls.map((fc: any, index: number) => ({
            id: `call_${Date.now()}_${index}`,
            name: fc.name,
            args: fc.args || {}
          }));
          return { toolRequests };
        }

        return { text: response.text || '' };
      },

      async submitToolResults(results: AIToolResult[]): Promise<AITurnResult> {
        const functionResponses = results.map(res => {
           let resultStr = '';
           try {
             resultStr = JSON.stringify(res.result);
           } catch(e) {
             resultStr = String(res.result);
           }
           if (resultStr.length > AIConfig.MAX_TOOL_RESULT_BYTES) {
              return { 
                name: (res as any).name || 'unknown', 
                response: { truncated: true, reason: 'RESULT_SIZE_LIMIT' } 
              };
           }
           return { name: (res as any).name, response: res.result };
        });

        const response = await sendMessageWithRetry({ message: functionResponses } as any);
        
        if (response.functionCalls && response.functionCalls.length > 0) {
          const toolRequests = response.functionCalls.map((fc: any, index: number) => ({
            id: `call_${Date.now()}_${index}`,
            name: fc.name,
            args: fc.args || {}
          }));
          return { toolRequests };
        }

        return { text: response.text || '' };
      }
    };
  }
}
