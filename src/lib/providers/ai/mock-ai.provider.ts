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
    Logger.info(`[MOCK AI] Generation requested`, { tools: tools.length });
    const p = prompt.toLowerCase();

    // Very naive NLP for demo purposes
    let executedData = null;
    let contextName = '';
    const toolsRequested: string[] = [];
    const toolsExecuted: string[] = [];

    if (p.includes('incident') || p.includes('security')) {
      const tool = tools.find(t => t.name === 'getIncidentSummary');
      if (tool) {
        toolsRequested.push('getIncidentSummary');
        executedData = await tool.execute({});
        toolsExecuted.push('getIncidentSummary');
        contextName = 'security';
      }
    } else if (p.includes('customer') || p.includes('lead')) {
      const tool = tools.find(t => t.name === 'getCustomerSummary');
      if (tool) {
        toolsRequested.push('getCustomerSummary');
        executedData = await tool.execute({});
        toolsExecuted.push('getCustomerSummary');
        contextName = 'crm';
      }
    } else if (p.includes('camera') || p.includes('video')) {
      const tool = tools.find(t => t.name === 'getCameraStatus');
      if (tool) {
        toolsRequested.push('getCameraStatus');
        executedData = await tool.execute({});
        toolsExecuted.push('getCameraStatus');
        contextName = 'cameras';
      }
    } else if (p.includes('communication') || p.includes('email') || p.includes('sms')) {
      const tool = tools.find(t => t.name === 'getCommunicationSummary');
      if (tool) {
        toolsRequested.push('getCommunicationSummary');
        executedData = await tool.execute({});
        toolsExecuted.push('getCommunicationSummary');
        contextName = 'communication';
      }
    } else if (p.includes('billing') || p.includes('plan') || p.includes('subscription')) {
      const tool = tools.find(t => t.name === 'getBillingSummary');
      if (tool) {
        toolsRequested.push('getBillingSummary');
        executedData = await tool.execute({});
        toolsExecuted.push('getBillingSummary');
        contextName = 'billing';
      }
    }

    const baseTelemetry = {
      toolsRequested,
      toolsExecuted,
      rounds: toolsExecuted.length > 0 ? 1 : 0,
      totalToolCalls: toolsExecuted.length,
      terminationReason: 'COMPLETE' as const,
    };

    if (!executedData) {
      return {
        text: "I'm sorry, I couldn't understand which part of your business you're asking about. Try asking about incidents, customers, cameras, or billing.",
        ...baseTelemetry,
      };
    }

    // Format the mock response based on the context
    let text = "Here is the raw data I found: " + JSON.stringify(executedData);
    if (contextName === 'security') {
      text = `You have a total of ${executedData.total} incidents. Currently, ${executedData.open} are open and ${executedData.critical} are critical. ${executedData.resolved} have been resolved.`;
    } else if (contextName === 'crm') {
      text = `Your CRM currently tracks ${executedData.customers} customers and ${executedData.leads} active leads, with a conversion rate of ${executedData.conversionRate}%.`;
    } else if (contextName === 'cameras') {
      text = `You have ${executedData.total} provisioned cameras. ${executedData.active} are currently active/online, and ${executedData.offline} are offline.`;
    } else if (contextName === 'communication') {
      text = `We have dispatched ${executedData.total} communications (${executedData.email} emails, ${executedData.sms} SMS, ${executedData.whatsapp} WhatsApp). The success rate is ${executedData.successRate}%.`;
    } else if (contextName === 'billing') {
      text = `You are currently on the ${executedData.planName} plan. Your usage is at ${executedData.usagePercentage}% of your limits.`;
    }

    return { text, ...baseTelemetry };
  }
}
