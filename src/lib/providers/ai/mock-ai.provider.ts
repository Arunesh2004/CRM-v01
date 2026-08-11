import { AIProvider, AITool } from './ai-provider.interface';
import { Logger } from '../../logger/logger';

export class MockAIProvider implements AIProvider {
  async generateResponse(prompt: string, tools: AITool[], systemInstruction?: string): Promise<string> {
    Logger.info('[MOCK AI] Received prompt:', { prompt });
    const p = prompt.toLowerCase();
    
    // Very naive NLP for demo purposes
    let executedData = null;
    let contextName = '';

    if (p.includes('incident') || p.includes('security')) {
      const tool = tools.find(t => t.name === 'getIncidentSummary');
      if (tool) {
        executedData = await tool.execute({});
        contextName = 'security';
      }
    } else if (p.includes('customer') || p.includes('lead')) {
      const tool = tools.find(t => t.name === 'getCustomerSummary');
      if (tool) {
        executedData = await tool.execute({});
        contextName = 'crm';
      }
    } else if (p.includes('camera') || p.includes('video')) {
      const tool = tools.find(t => t.name === 'getCameraStatus');
      if (tool) {
        executedData = await tool.execute({});
        contextName = 'cameras';
      }
    } else if (p.includes('communication') || p.includes('email') || p.includes('sms')) {
      const tool = tools.find(t => t.name === 'getCommunicationSummary');
      if (tool) {
        executedData = await tool.execute({});
        contextName = 'communication';
      }
    } else if (p.includes('billing') || p.includes('plan') || p.includes('subscription')) {
      const tool = tools.find(t => t.name === 'getBillingSummary');
      if (tool) {
        executedData = await tool.execute({});
        contextName = 'billing';
      }
    }

    if (!executedData) {
      return "I'm sorry, I couldn't understand which part of your business you're asking about. Try asking about incidents, customers, cameras, or billing.";
    }

    // Format the mock response based on the context
    if (contextName === 'security') {
      return `You have a total of ${executedData.total} incidents. Currently, ${executedData.open} are open and ${executedData.critical} are critical. ${executedData.resolved} have been resolved.`;
    } else if (contextName === 'crm') {
      return `Your CRM currently tracks ${executedData.customers} customers and ${executedData.leads} active leads, with a conversion rate of ${executedData.conversionRate}%.`;
    } else if (contextName === 'cameras') {
      return `You have ${executedData.total} provisioned cameras. ${executedData.active} are currently active/online, and ${executedData.offline} are offline.`;
    } else if (contextName === 'communication') {
      return `We have dispatched ${executedData.total} communications (${executedData.email} emails, ${executedData.sms} SMS, ${executedData.whatsapp} WhatsApp). The success rate is ${executedData.successRate}%.`;
    } else if (contextName === 'billing') {
      return `You are currently on the ${executedData.planName} plan. Your usage is at ${executedData.usagePercentage}% of your limits.`;
    }

    return "Here is the raw data I found: " + JSON.stringify(executedData);
  }
}
