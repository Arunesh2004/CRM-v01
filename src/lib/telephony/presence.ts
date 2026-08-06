import { Logger } from '../logger/logger';

export enum AgentPresenceState {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY'
}

export class AgentPresenceSystem {
  
  static async updatePresence(tenantId: string, userId: string, state: AgentPresenceState): Promise<void> {
    // Architecturally this would update a fast Redis store to prevent DB locks during heavy routing
    Logger.info(`Agent presence updated: ${state}`, { tenantId, userId });
    // await redis.set(`presence:${tenantId}:${userId}`, state);
  }

  static async getAvailableAgents(tenantId: string): Promise<string[]> {
    // Look up all agents in tenant with AVAILABLE state
    // const agents = await redis.keys(`presence:${tenantId}:*`);
    Logger.info(`Resolving available agents`, { tenantId });
    return ['user_agent_1', 'user_agent_2']; // Mock pool
  }
}
