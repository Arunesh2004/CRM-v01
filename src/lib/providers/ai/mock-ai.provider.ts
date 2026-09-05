import { AIProvider, AITool, AIResponse } from './ai-provider.interface';
import { Logger } from '../../logger/logger';

export class MockAIProvider implements AIProvider {
  async generateResponse(
    prompt: string,
    tools: AITool[],
    systemInstruction?: string,
    requestId?: string,
    history?: {role: 'user'|'assistant', content: string}[]
  ): Promise<AIResponse> {
    Logger.info(`[MOCK AI] Generation requested`, { tools: tools.length, prompt });
    const p = prompt.toLowerCase();

    const toolsRequested: string[] = [];
    const toolsExecuted: string[] = [];
    let executedData = null;
    let text = "Demo AI Copilot is active. I can help search CRM records, retrieve customer details, or update leads.";

    try {
      if (p.includes('search') || p.includes('find') || p.includes('look up')) {
        const tool = tools.find(t => t.name === 'search_crm');
        if (tool) {
          // Naive extraction: "search for Acme" -> "Acme"
          let query = prompt.replace(/(search for|search|find|look up) /ig, '').trim();
          if (!query) query = 'test';

          toolsRequested.push('search_crm');
          executedData = await tool.execute({ query });
          toolsExecuted.push('search_crm');
          
          text = `I found ${executedData?.length || 0} matching CRM records for "${query}".`;
        }
      } else if (p.includes('show customer') || p.includes('get customer') || p.includes('customer details')) {
        const tool = tools.find(t => t.name === 'get_customer');
        if (tool) {
          // Naive extraction: "show customer 123" -> "123"
          const customerId = prompt.replace(/(show customer|get customer|customer details)/i, '').trim();
          if (!customerId) throw new Error("Please provide a valid customer ID.");

          toolsRequested.push('get_customer');
          executedData = await tool.execute({ customerId });
          toolsExecuted.push('get_customer');
          
          text = `Here are the details for customer: ${executedData?.name || customerId}.`;
        }
      } else if (p.includes('update lead') || p.includes('move lead') || p.includes('change lead status')) {
        const tool = tools.find(t => t.name === 'update_lead');
        if (tool) {
          // Naive extraction: "move lead XYZ to QUALIFIED"
          const tokens = prompt.split(' ');
          const leadIdIndex = tokens.findIndex(t => t.toLowerCase() === 'lead') + 1;
          const toIndex = tokens.findIndex(t => t.toLowerCase() === 'to');
          
          if (leadIdIndex > 0 && leadIdIndex < tokens.length) {
             const leadId = tokens[leadIdIndex];
             let status = '';
             
             if (toIndex > leadIdIndex && toIndex + 1 < tokens.length) {
               status = tokens[toIndex + 1].toUpperCase();
             } else {
               // Just pick the last word if 'to' is missing
               status = tokens[tokens.length - 1].toUpperCase();
             }

             const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED'];
             if (!validStatuses.includes(status)) {
               throw new Error(`Invalid lead status: ${status}. Allowed statuses are: ${validStatuses.join(', ')}.`);
             }

             toolsRequested.push('update_lead');
             executedData = await tool.execute({ leadId, status });
             toolsExecuted.push('update_lead');
             
             text = `Successfully updated lead ${leadId} to status ${status}.`;
          } else {
             throw new Error("Could not determine lead ID or status from the request.");
          }
        }
      }
    } catch (error: any) {
      Logger.error('[MOCK AI] Tool execution failed', error);
      // Determine if error is an authorization failure (from AIPermissionService)
      if (error.message?.includes('403') || error.message?.includes('Forbidden') || error.message?.includes('unauthorized') || error.message?.includes('denied')) {
        text = "Access denied. You do not have permission to perform this action.";
      } else {
        text = error.message || "An error occurred while executing the tool.";
      }
      // If a tool threw an error, it might not have populated executedData, but we might still return the error text
    }

    const baseTelemetry = {
      toolsRequested,
      toolsExecuted,
      rounds: toolsExecuted.length > 0 ? 1 : 0,
      totalToolCalls: toolsExecuted.length,
      terminationReason: 'COMPLETE' as const,
    };

    return { text, ...baseTelemetry };
  }

  // ---------------------------------------------------------------------------
  // SUBPHASE B: NEW PROVIDER-NEUTRAL INTERFACE
  // ---------------------------------------------------------------------------
  createSession(aiContext: any): import('./ai-provider.interface').AISession {
    // We treat aiContext as immutable. We freeze it as defense-in-depth, though it's not the real boundary.
    Object.freeze(aiContext);
    
    return {
      async processTurn(context: import('./ai-provider.interface').AITurnContext) {
        Logger.info(`[MOCK AI V2] Session generation requested`, { prompt: context.prompt });
        const p = context.prompt.toLowerCase();
        
        // This mock does NOT execute tools. It merely parses the prompt and returns structured intents.
        if (p.includes('search') || p.includes('find') || p.includes('look up')) {
          let query = context.prompt.replace(/(search for|search|find|look up) /ig, '').trim();
          if (!query) query = 'test';
          return {
            toolRequests: [{
              id: 'call_' + Math.random().toString(36).substring(7),
              name: 'search_crm',
              args: { query }
            }]
          };
        } else if (p.includes('show customer') || p.includes('get customer') || p.includes('customer details')) {
          const customerId = context.prompt.replace(/(show customer|get customer|customer details)/i, '').trim();
          if (!customerId) throw new Error("Please provide a valid customer ID.");
          return {
            toolRequests: [{
              id: 'call_' + Math.random().toString(36).substring(7),
              name: 'get_customer',
              args: { customerId }
            }]
          };
        } else if (p.includes('update lead') || p.includes('move lead') || p.includes('change lead status')) {
          const tokens = context.prompt.split(' ');
          const leadIdIndex = tokens.findIndex(t => t.toLowerCase() === 'lead') + 1;
          const toIndex = tokens.findIndex(t => t.toLowerCase() === 'to');
          
          if (leadIdIndex > 0 && leadIdIndex < tokens.length) {
             const leadId = tokens[leadIdIndex];
             let status = '';
             
             if (toIndex > leadIdIndex && toIndex + 1 < tokens.length) {
               status = tokens[toIndex + 1].toUpperCase();
             } else {
               status = tokens[tokens.length - 1].toUpperCase();
             }

             // We simulate an LLM payload, even if invalid.
             return {
               toolRequests: [{
                 id: 'call_' + Math.random().toString(36).substring(7),
                 name: 'update_lead',
                 args: { leadId, status }
               }]
             };
          }
          return { text: "Could not determine lead ID or status from the request." };
        }
        
        return { text: "Demo AI Copilot is active. I can help search CRM records, retrieve customer details, or update leads." };
      },

      async submitToolResults(results: import('./ai-provider.interface').AIToolResult[]) {
        // In a real provider, we'd feed this back into the LLM. 
        // For the mock, we just generate a generic confirmation text based on the results.
        const res = results[0];
        if (res.isError) {
          return { text: `Error executing tool: ${res.result}` };
        }
        return { text: `Successfully processed results for tool call ${res.toolCallId}.` };
      }
    };
  }
}

