import { AIProvider } from './ai-provider.interface';
import { MockAIProvider } from './mock-ai.provider';

import { GeminiProvider } from './gemini.provider';

export type SupportedAIProvider = 'MOCK' | 'OPENAI' | 'GEMINI';

export class AIProviderFactory {
  static getProvider(providerName: SupportedAIProvider): AIProvider {
    if (process.env.APP_MODE === 'demo' || providerName === 'MOCK') {
      return new MockAIProvider();
    }
    
    switch (providerName) {
      case 'OPENAI':
        // return new OpenAIProvider();
        throw new Error('OpenAI Provider not yet implemented');
      case 'GEMINI':
        return new GeminiProvider();
      default:
        throw new Error(`Unsupported AI provider: ${providerName}`);
    }
  }

  static getEngineProvider(providerName: SupportedAIProvider): import('./ai-provider.interface').AIEngineProvider {
    if (process.env.APP_MODE === 'demo' || providerName === 'MOCK') {
      return new MockAIProvider();
    }
    throw new Error(`AIEngineProvider is only implemented for MOCK in this phase. Requested: ${providerName}`);
  }
}
