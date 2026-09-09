import { AIRiskLevel } from '@prisma/client';

export interface CreateAIToolInput {
  name: string;
  description?: string;
  requiredPermission?: string;
  riskLevel: AIRiskLevel;
  requiresApproval: boolean;
}

export interface RequestAIExecutionInput {
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional dynamic record for generic context
  input: Record<string, any>;
}

export interface ApproveAIExecutionInput {
  executionId: string;
  approved: boolean;
}
