import { AIProvider } from './ai-provider.interface';
import { MockAIProvider } from './mock-ai.provider';

import { GeminiProvider } from './gemini.provider';
import { GeminiEngineProvider } from './gemini-engine.provider';

export type SupportedAIProvider = 'MOCK' | 'OPENAI' | 'GEMINI';

import { LoadTestAIProvider } from '../load-test-mock.provider';

export class AIProviderFactory {
  static getProvider(providerName: SupportedAIProvider): AIProvider {
    if (process.env.LOAD_TEST_MODE === 'true') return new LoadTestAIProvider();
    
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
    if (providerName === 'GEMINI') {
      return new GeminiEngineProvider();
    }
    throw new Error(`AIEngineProvider is not supported for ${providerName}`);
  }

  static getVisionProvider(providerName: SupportedAIProvider): import('./vision-provider.interface').VisionInferenceProvider {
    if (process.env.APP_MODE === 'demo' || providerName === 'MOCK') {
      // In a real implementation we would have a MockVisionProvider, but for now we can either use Gemini or throw.
      // S14 requires no mock AI for E2E. If they request a vision provider, we must return the actual one or a strict mock.
      // We will default to returning GeminiVisionProvider and letting it throw AI_PROVIDER_NOT_CONFIGURED.
    }
    
    switch (providerName) {
      case 'GEMINI': {
        // dynamic import or require to avoid circular deps if any, but since it's just a class, we can import it above.
        const { GeminiVisionProvider } = require('./gemini-vision.provider');
        return new GeminiVisionProvider();
      }
      default:
        throw new Error(`Vision provider is not supported for ${providerName}`);
    }
  }
}
