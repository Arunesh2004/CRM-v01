import { AIProviderFactory } from '@/lib/providers/ai/ai-provider.factory';
import { secureTools } from './tools/ai.tools';
import { requireAuth, requireTenant } from '@/lib/auth';

export async function askAssistant(prompt: string) {
  // 1. Mandatory Context Checks (Even though tools check it, we enforce it top-level too)
  await requireAuth();
  await requireTenant();
  
  // 2. Resolve Provider
  // If in demo mode, it will return MockAIProvider
  const provider = AIProviderFactory.getProvider('MOCK');
  
  // 3. Generate response by passing the prompt and secure tools list
  // The provider evaluates the prompt, calls a tool if needed, and formulates an answer.
  const response = await provider.generateResponse(prompt, secureTools);
  
  return response;
}
