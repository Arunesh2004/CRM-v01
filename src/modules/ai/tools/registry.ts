import { AITool } from '@/lib/providers/ai/ai-provider.interface';
import { crmTools } from './crm.tools';
import prisma from '@db/utils/prisma';
import { AIContext } from '../context/context-builder.service';
import { SecurityEventService } from '@/modules/security-events/security-event.service';

export class ToolRegistry {
  private static tools: Map<string, AITool> = new Map(
    [...crmTools].map(t => [t.name, t])
  );

  static getTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  static async executeTool(toolName: string, args: any, context: AIContext): Promise<any> {
    const tool = this.tools.get(toolName);
    
    // Fail closed: Unknown capability
    if (!tool) {
      await SecurityEventService.logEvent(context.tenantId, {
        eventType: 'AI_BLOCKED_ACTION',
        severity: 'HIGH',
        source: 'ToolRegistry',
        metadata: { reason: 'Unknown tool requested', toolName }
      }, 'USER', context.user.id);
      throw new Error(`Unauthorized: Tool ${toolName} not found`);
    }

    // Fail closed: Missing authorization metadata on tool
    const requiredPermission = tool.requiredResource && tool.requiredAction ? `${tool.requiredResource}:${tool.requiredAction}` : null;
    if (!requiredPermission) {
      throw new Error(`Unauthorized: Tool ${toolName} lacks strict permission requirements`);
    }

    // Fail closed: Unauthorized capability
    if (!context.permissions.includes(requiredPermission)) {
      await SecurityEventService.logEvent(context.tenantId, {
        eventType: 'AI_BLOCKED_ACTION',
        severity: 'HIGH',
        source: 'ToolRegistry',
        metadata: { reason: 'Missing required permission for tool', toolName, requiredPermission }
      }, 'USER', context.user.id);
      throw new Error(`Unauthorized: Missing required permission ${requiredPermission}`);
    }

    // Reject identity arguments to prevent context override (do not silently drop)
    if ('tenantId' in args || 'userId' in args || 'departmentId' in args) {
      await SecurityEventService.logEvent(context.tenantId, {
        eventType: 'AI_BLOCKED_ACTION',
        severity: 'HIGH',
        source: 'ToolRegistry',
        metadata: { reason: 'AI attempted to supply identity arguments', toolName, args }
      }, 'USER', context.user.id);
      throw new Error(`Unauthorized: Tool arguments cannot override identity context`);
    }
    const sanitizedArgs = { ...args };
    
    if (tool.confirmation_required && !sanitizedArgs.idempotencyKey) {
      const dbTool = await prisma.aITool.findUnique({ where: { name: toolName } });
      if (!dbTool) throw new Error(`Unauthorized: Tool ${toolName} not found in database`);
      
      const execution = await prisma.aIExecution.create({
        data: {
          tenantId: context.tenantId,
          userId: context.user.id,
          toolId: dbTool.id,
          status: 'PENDING',
          input: JSON.stringify(sanitizedArgs)
        }
      });
      return { _type: 'PENDING_CONFIRMATION', executionId: execution.id };
    }

    // Execute the actual tool
    return await tool.execute(sanitizedArgs, context);
  }

  static async bootstrapTools() {
    const toolsToEnsure = this.getTools().map(t => ({
      name: t.name,
      requiredPermission: t.requiredResource && t.requiredAction ? `${t.requiredResource}:${t.requiredAction}` : null,
      riskLevel: t.requiredAction === 'CREATE' || t.requiredAction === 'UPDATE' || t.requiredAction === 'DELETE' ? 'MODERATE' : 'LOW'
    }));

    for (const t of toolsToEnsure) {
      if (!t.requiredPermission) continue; // Skip registering un-permissioned tools, although they would fail at runtime anyway.
      
      await prisma.aITool.upsert({
        where: { name: t.name },
        update: {
          requiredPermission: t.requiredPermission,
          riskLevel: t.riskLevel as any,
        },
        create: {
          name: t.name,
          requiredPermission: t.requiredPermission,
          riskLevel: t.riskLevel as any,
          requiresApproval: false
        }
      });
    }
  }
}
