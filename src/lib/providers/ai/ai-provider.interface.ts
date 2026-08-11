import { Resource, Action } from '@prisma/client';

export interface AIProvider {
  /**
   * Generates a response from the AI model, potentially executing tools
   * along the way. The AI Provider should NOT be responsible for tenant context;
   * it just executes the function signatures given.
   */
  generateResponse(
    prompt: string,
    tools: AITool[],
    systemInstruction?: string,
    requestId?: string,
    history?: {role: 'user'|'assistant', content: string}[]
  ): Promise<string>;
}

export interface AITool {
  name: string;
  description: string;
  parameters?: Record<string, any>; // JSON schema format for tool arguments
  requiredResource?: Resource;
  requiredAction?: Action;
  execute: (args: any) => Promise<any>;
}
