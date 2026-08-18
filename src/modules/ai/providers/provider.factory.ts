import { AIProvider } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { decrypt } from '../../../lib/encryption';

export class ProviderFactory {
  static createProvider(provider: string, encryptedApiKey: string): AIProvider {
    const apiKey = decrypt(encryptedApiKey);

    switch (provider.toUpperCase()) {
      case 'OPENAI':
        return new OpenAIProvider(apiKey);
      case 'GEMINI':
        // return new GeminiProvider(apiKey);
        throw new Error("Gemini provider not yet implemented");
      case 'CLAUDE':
        // return new ClaudeProvider(apiKey);
        throw new Error("Claude provider not yet implemented");
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}
