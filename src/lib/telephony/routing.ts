import { Logger } from '../logger/logger';
import { AgentPresenceSystem, AgentPresenceState } from './presence';

export interface RoutingRules {
  checkBusinessHours: boolean;
  strategy: 'ROUND_ROBIN' | 'SKILL_BASED' | 'DIRECT';
  fallbackNumber?: string;
}

export class RoutingEngine {
  
  static async getInboundTwiML(tenantId: string, contactId: string, rules: RoutingRules): Promise<string> {
    Logger.info(`Executing routing engine for contact ${contactId}`, { tenantId, strategy: rules.strategy });
    
    // 1. Business Hours Check
    if (rules.checkBusinessHours && !this.isWithinBusinessHours(tenantId)) {
       Logger.info('Outside business hours, routing to voicemail', { tenantId });
       return '<Response><Say>We are currently closed. Please leave a message.</Say><Record /></Response>';
    }

    // 2. Agent Resolution
    let selectedAgentPhone = '';
    if (rules.strategy === 'DIRECT') {
      // Find assigned CRM user for this contact
      // const assignedUser = await prisma.customerContact.findUnique({ where: { id: contactId }}).customer().assignedUser();
      // selectedAgentPhone = assignedUser.phone;
      selectedAgentPhone = '+15550001111'; // Simulated
    } else if (rules.strategy === 'ROUND_ROBIN') {
      const availableAgents = await AgentPresenceSystem.getAvailableAgents(tenantId);
      if (availableAgents.length > 0) {
        selectedAgentPhone = '+15550002222'; // Simulated routing to availableAgents[0]
      }
    }

    // 3. Fallback
    if (!selectedAgentPhone && rules.fallbackNumber) {
      selectedAgentPhone = rules.fallbackNumber;
    }

    if (!selectedAgentPhone) {
      return '<Response><Say>No agents are available. Goodbye.</Say><Hangup /></Response>';
    }

    // 4. Generate TwiML Dial
    return `<Response><Dial>${selectedAgentPhone}</Dial></Response>`;
  }

  private static isWithinBusinessHours(tenantId: string): boolean {
    // Look up tenant business hours config in DB
    return true; // Simplified for abstraction
  }

  static validateOutboundLimits(tenantId: string, destinationCountry: string): boolean {
    // 1. Tenant Usage Limit Validation (e.g. out of funds)
    // const limits = await prisma.plan.findFirst(...)
    
    // 2. Country Restrictions (Toll Fraud Prevention)
    const allowedCountries = ['US', 'CA', 'GB'];
    if (!allowedCountries.includes(destinationCountry)) {
       Logger.warn(`Blocked outbound call to unauthorized country: ${destinationCountry}`, { tenantId });
       return false;
    }
    return true;
  }
}
