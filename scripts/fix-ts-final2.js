const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { regex, replacement } of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(filePath, content);
}

// 1. context-builder.service.ts
const contextPath = path.join(__dirname, '../src/modules/ai/context/context-builder.service.ts');
replaceInFile(contextPath, [
  { regex: /roles:/g, replacement: "userRoles:" },
  { regex: /user\.roles/g, replacement: "user.userRoles" },
  { regex: /SecurityEventService\.logEvent\(\{[\s\S]*?tenantId,[\s\S]*?eventType: 'AI_PERMISSION_FAILURE',[\s\S]*?severity: 'HIGH',[\s\S]*?source: 'ContextBuilderService',[\s\S]*?userId,[\s\S]*?metadata: \{ reason: 'User not found during context build' \}[\s\S]*?\}\);/g, replacement: "SecurityEventService.logEvent(tenantId, { eventType: 'AI_PERMISSION_FAILURE', severity: 'HIGH', source: 'ContextBuilderService', metadata: { reason: 'User not found during context build' } }, 'USER', userId);" }
]);

// 2. embedding.service.ts
const embeddingPath = path.join(__dirname, '../src/modules/ai/rag/embedding.service.ts');
replaceInFile(embeddingPath, [
  { regex: /SecurityEventService\.logEvent\(\{[\s\S]*?tenantId: context\.tenantId,[\s\S]*?eventType: 'AI_BLOCKED_ACTION',[\s\S]*?severity: 'HIGH',[\s\S]*?source: 'EmbeddingService',[\s\S]*?userId: context\.user\.id,[\s\S]*?metadata: \{ reason: 'Unauthorized RAG retrieval attempt', error: \(error as Error\)\.message \}[\s\S]*?\}\);/g, replacement: "SecurityEventService.logEvent(context.tenantId, { eventType: 'AI_BLOCKED_ACTION', severity: 'HIGH', source: 'EmbeddingService', metadata: { reason: 'Unauthorized RAG retrieval attempt', error: (error as Error).message } }, 'USER', context.user.id);" }
]);

// 3. memory.service.ts
const memoryPath = path.join(__dirname, '../src/modules/ai/memory/memory.service.ts');
replaceInFile(memoryPath, [
  { regex: /SecurityEventService\.logEvent\(\{[\s\S]*?tenantId: context\.tenantId,[\s\S]*?eventType: 'SUSPICIOUS_ACTIVITY',[\s\S]*?severity: 'MEDIUM',[\s\S]*?source: 'AIMemoryService',[\s\S]*?userId: context\.user\.id,[\s\S]*?metadata: \{ reason: 'Memory poisoning attempt or invalid memory', error: \(error as Error\)\.message \}[\s\S]*?\}\);/g, replacement: "SecurityEventService.logEvent(context.tenantId, { eventType: 'SUSPICIOUS_ACTIVITY', severity: 'MEDIUM', source: 'AIMemoryService', metadata: { reason: 'Memory poisoning attempt or invalid memory', error: (error as Error).message } }, 'USER', context.user.id);" }
]);

// 4. workflow.service.ts
const workflowPath = path.join(__dirname, '../src/modules/ai/workflow/workflow.service.ts');
replaceInFile(workflowPath, [
  { regex: /userId,/g, replacement: "actorId: userId, actorType: 'USER'," },
  { regex: /details: JSON\.stringify\(\{ actionType, status: 'COMPLETED' \}\)/g, replacement: "metadata: { actionType, status: 'COMPLETED' }" },
  { regex: /SecurityEventService\.logEvent\(\{[\s\S]*?tenantId,[\s\S]*?eventType: 'AI_BLOCKED_ACTION',[\s\S]*?severity: 'HIGH',[\s\S]*?source: 'WorkflowEngine',[\s\S]*?actorId: userId, actorType: 'USER',[\s\S]*?metadata: \{ executionId, actionId, error: \(error as Error\)\.message \}[\s\S]*?\}\);/g, replacement: "SecurityEventService.logEvent(tenantId, { eventType: 'AI_BLOCKED_ACTION', severity: 'HIGH', source: 'WorkflowEngine', metadata: { executionId, actionId, error: (error as Error).message } }, 'USER', userId);" }
]);

console.log('Final 2 TS fixed!');
