import { AITool } from '@/lib/providers/ai/ai-provider.interface';
import { crmTools } from './crm.tools';
import prisma from '@db/utils/prisma';

export class ToolRegistry {
  private static tools: AITool[] = [
    ...crmTools,
  ];

  static getTools(): AITool[] {
    return this.tools;
  }

  static async bootstrapTools() {
    const toolsToEnsure = this.tools.map(t => ({
      name: t.name,
      requiredPermission: t.requiredResource && t.requiredAction ? `${t.requiredResource}:${t.requiredAction}` : null,
      riskLevel: t.requiredAction === 'CREATE' || t.requiredAction === 'UPDATE' || t.requiredAction === 'DELETE' ? 'MODERATE' : 'LOW'
    }));

    for (const t of toolsToEnsure) {
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
