import { AIProvider, GenerateCompletionOptions, GenerateEmbeddingOptions, CompletionResponse, EmbeddingResponse } from './ai-provider.interface';

export class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateCompletion(options: GenerateCompletionOptions): Promise<CompletionResponse> {
    // In a real implementation, this would use fetch() to call the OpenAI API.
    // For this implementation, we return a mock response.
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    return {
      content: `[Mock AI Response for: ${options.messages[options.messages.length - 1].content.substring(0, 50)}...]`,
      usage: {
        inputTokens: 150,
        outputTokens: 50,
        totalTokens: 200,
      }
    };
  }

  async generateEmbeddings(options: GenerateEmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    const inputs = Array.isArray(options.input) ? options.input : [options.input];
    const mockEmbeddings = inputs.map(() => new Array(1536).fill(0.01));

    return {
      embeddings: mockEmbeddings,
      usage: {
        inputTokens: 100 * inputs.length,
        outputTokens: 0,
        totalTokens: 100 * inputs.length,
      }
    };
  }
}
