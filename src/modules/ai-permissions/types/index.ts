import { AIRiskLevel, AIExecutionStatus, AITool } from '@prisma/client';

export interface CreateAIToolInput {
  name: string;
  description?: string;
  requiredPermission?: string;
  riskLevel: AIRiskLevel;
  requiresApproval: boolean;
}

export interface RequestAIExecutionInput {
  toolName: string;
  input: Record<string, any>;
}

export interface ApproveAIExecutionInput {
  executionId: string;
  approved: boolean;
}
