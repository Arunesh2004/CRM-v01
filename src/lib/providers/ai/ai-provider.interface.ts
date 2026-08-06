export interface AIProvider {
  /**
   * Generates a response from the AI model, potentially executing tools
   * along the way. The AI Provider should NOT be responsible for tenant context;
   * it just executes the function signatures given.
   */
  generateResponse(prompt: string, tools: AITool[]): Promise<string>;
}

export interface AITool {
  name: string;
  description: string;
  execute: () => Promise<any>;
}
