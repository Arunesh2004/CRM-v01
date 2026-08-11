import { GoogleGenAI } from '@google/genai';
import { AIProvider, AITool } from './ai-provider.interface';
import { Logger } from '../../logger/logger';

const MAX_TOOL_ROUNDS = 5;
const TIMEOUT_MS = 30000;

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

  async generateResponse(prompt: string, tools: AITool[], systemInstruction?: string): Promise<string> {
    try {
      return await this.executeWithTimeout(this.runGenerationLoop(prompt, tools, systemInstruction), TIMEOUT_MS);
    } catch (err: any) {
      Logger.error('[GEMINI] Provider error:', err);
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

  private async runGenerationLoop(prompt: string, tools: AITool[], systemInstruction?: string): Promise<string> {
    const geminiTools = tools.length > 0 ? [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: 'OBJECT', properties: {} }
      }))
    }] : undefined;

    const chat = this.ai.chats.create({
      model: this.modelName,
      config: {
        systemInstruction,
        tools: geminiTools as any,
        temperature: 0.1,
      }
    });

    let response = await chat.sendMessage({ message: prompt });
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionResponses = [];

        for (const call of response.functionCalls) {
          const toolName = call.name;
          const args = call.args || {};
          
          Logger.info(`[GEMINI] Model requested tool: ${toolName}`);
          
          const tool = tools.find(t => t.name === toolName);
          let result;
          
          if (!tool) {
            result = { error: `Tool ${toolName} not found or not authorized.` };
          } else {
            try {
              const toolResult = await tool.execute(args);
              // Serialize and parse to strip complex objects, cap size roughly
              const resultStr = JSON.stringify(toolResult);
              const truncatedStr = resultStr.length > 15000 ? resultStr.substring(0, 15000) + '... (truncated)' : resultStr;
              result = { data: truncatedStr };
            } catch (err: any) {
              Logger.warn(`[GEMINI] Tool ${toolName} failed:`, err.message);
              result = { error: err.message };
            }
          }

          functionResponses.push({
            name: toolName,
            response: result
          });
        }

        // Send function responses back
        // @google/genai requires sending functionResponses in an array
        response = await chat.sendMessage({ message: functionResponses } as any);
        rounds++;
      } else {
        return response.text || '';
      }
    }

    throw new Error('Maximum tool iterations exceeded');
  }
}
