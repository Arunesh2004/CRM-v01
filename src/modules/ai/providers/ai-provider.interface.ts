export interface GenerateCompletionOptions {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateEmbeddingOptions {
  model: string;
  input: string | string[];
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CompletionResponse {
  content: string;
  usage: TokenUsage;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  usage: TokenUsage;
}

export interface AIProvider {
  generateCompletion(options: GenerateCompletionOptions): Promise<CompletionResponse>;
  generateEmbeddings(options: GenerateEmbeddingOptions): Promise<EmbeddingResponse>;
}
