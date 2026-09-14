import { AITool } from '@/lib/providers/ai/ai-provider.interface';
import { CANONICAL_AI_TOOLS } from './config';
import { crmTools } from './crm.tools';
import prisma from '@db/utils/prisma';
import { AIContext } from '../context/context-builder.service';
import { SecurityEventService } from '@/modules/security-events/security-event.service';
import { withTenant } from '@db/utils/prisma-tenant';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

export class ToolRegistry {
  private static tools: Map<string, AITool> = new Map(
    [...crmTools].map(t => [t.name, t])
  );

  static getTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
      
      const execution = await withTenant(context.tenantId).aIExecution.create({
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
    const rawResult = await tool.execute(sanitizedArgs, context);

    // G10: Prompt-Injection Boundary for Untrusted Data
    // We encapsulate the untrusted CRM data in explicit structural delimiters.
    // This allows the model to distinguish instructions from fetched data.
    if (typeof rawResult === 'object' && rawResult !== null) {
      return `<crm_data>\n${JSON.stringify(rawResult)}\n</crm_data>`;
    }
    return `<crm_data>\n${String(rawResult)}\n</crm_data>`;
  }

  static async bootstrapTools() {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      for (const t of CANONICAL_AI_TOOLS) {
        await tx.aITool.upsert({
          where: { name: t.name },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          update: {
            requiredPermission: `${t.requiredResource}:${t.requiredAction}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            riskLevel: t.riskLevel as any,
            requiresApproval: t.requiresApproval
          },
          create: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            name: t.name,
            description: t.description,
            requiredPermission: `${t.requiredResource}:${t.requiredAction}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            riskLevel: t.riskLevel as any,
            requiresApproval: t.requiresApproval
          }
        });
      }
    });
  }
}
