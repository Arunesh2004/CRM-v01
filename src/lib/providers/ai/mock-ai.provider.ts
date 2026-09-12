import { AIProvider, AITool, AIResponse } from './ai-provider.interface';
import { Logger } from '../../logger/logger';

export class MockAIProvider implements AIProvider {
  async generateResponse(
    prompt: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tools: AITool[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    systemInstruction?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestId?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    history?: {role: 'user'|'assistant', content: string}[]
  ): Promise<AIResponse> {
    Logger.warn(`[MOCK AI] Generation requested but AI provider is not configured.`, { prompt });
    throw new Error('AI_PROVIDER_NOT_CONFIGURED');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSession(aiContext: any): import('./ai-provider.interface').AISession {
    Object.freeze(aiContext);
    
    return {
      async processTurn(context: import('./ai-provider.interface').AITurnContext) {
        Logger.warn(`[MOCK AI V2] Session generation requested but AI provider is not configured.`, { prompt: context.prompt });
        throw new Error('AI_PROVIDER_NOT_CONFIGURED');
      },

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async submitToolResults(results: import('./ai-provider.interface').AIToolResult[]) {
        throw new Error('AI_PROVIDER_NOT_CONFIGURED');
      }
    };
  }
}


