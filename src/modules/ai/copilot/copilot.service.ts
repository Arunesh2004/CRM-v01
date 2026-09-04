import { Logger } from '@/lib/logger/logger';
import { AIProviderFactory } from '@/lib/providers/ai/ai-provider.factory';
import { ToolRegistry } from '../tools/registry';
import { ConversationService } from '../conversation.service';
import { AIRole } from '@prisma/client';
import { withTenant } from '@/../database/utils/prisma-tenant';

let toolsBootstrapped = false;

export class CopilotService {
  /**
   * Secure Copilot Chat execution supporting summarization and safe drafting.
   */
  static async handleChat(tenantId: string, userId: string, message: string, conversationId?: string) {
    if (!toolsBootstrapped) {
      await ToolRegistry.bootstrapTools();
      toolsBootstrapped = true;
    }

    let activeConversationId = conversationId;
    
    // 1. Resolve or Create Conversation
    if (!activeConversationId) {
      const newConv = await ConversationService.createConversation(tenantId, userId, message);
      activeConversationId = newConv.id;
    } else {
      // Validate ownership
      const conv = await ConversationService.getOwnedConversation(tenantId, userId, activeConversationId);
      if (!conv) {
        throw new Error('Conversation not found or unauthorized');
      }
    }

    // 2. Persist the User's Message
    await ConversationService.addMessage(tenantId, userId, activeConversationId, AIRole.USER, message);

    // 3. Load Bounded Conversation History
    // Reverse the array because getConversationMessages returns descending order (latest first)
    const historyDesc = await ConversationService.getConversationMessages(tenantId, userId, activeConversationId);
    const history = historyDesc.reverse().map(msg => ({
      role: msg.role === AIRole.USER ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));

    // 4. Determine AI Provider context based on authenticated role
    const tenantPrisma = withTenant(tenantId);
    const userRoles = await tenantPrisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });
    const isDemoUser = userRoles.some((ur: any) => ur.role.name === 'DEMO_USER');
    const providerType = isDemoUser ? 'MOCK' : 'GEMINI';
    
    const provider = AIProviderFactory.getProvider(providerType);
    // Construct system prompt preventing prompt-injection overrides
    const systemPrompt = `
      You are an internal Enterprise AI Sales Assistant. 
      You operate under strict tenant isolation. 
      You cannot change ownership, send emails autonomously, approve quotes, or mutate deals directly unless via approved tools.
      For summarizing deals or customers, use the provided tools.
      Any email you draft must be presented to the user as DRAFT text. DO NOT send emails.
    `;

    const tools = ToolRegistry.getTools();
    const context = { tenantId, userId };

    const toolResponses: any[] = [];
    
    // Wrap tools to capture responses and inject context safely
    const wrappedTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      execute: async (args: any) => {
        try {
          const result = await t.execute(args, context);
          toolResponses.push({ name: t.name, result });
          return result;
        } catch (error: any) {
          Logger.error(`Tool execution error in ${t.name}`, error);
          const errorObj = { name: t.name, error: error.message };
          toolResponses.push(errorObj);
          return errorObj; // We return the error so the AI knows it failed
        }
      }
    }));

    // 5. Generate Response
    // We pass history (which already includes the user's latest message as the last element).
    // The provider's generateResponse signature: (prompt, tools, systemPrompt, toolExecCtx, history)
    // Actually, wait, GeminiProvider uses `prompt` as the final user message.
    // So we should exclude the latest message from `history` since we pass it as `message`.
    const priorHistory = history.slice(0, -1);

    const response = await provider.generateResponse(
      message,
      wrappedTools,
      systemPrompt,
      undefined,
      priorHistory
    );

    // 6. Persist Assistant Response
    await ConversationService.addMessage(tenantId, userId, activeConversationId, AIRole.ASSISTANT, response.text);

    return { 
      conversationId: activeConversationId,
      text: response.text, 
      toolResponses 
    };
  }
}
