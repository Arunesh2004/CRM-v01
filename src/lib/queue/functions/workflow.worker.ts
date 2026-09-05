import { inngest } from '../inngest.client';
import { SecureJobEnvelope } from '../types';
import { WorkflowService } from '@/modules/ai/workflow/workflow.service';

export const workflowWorker = inngest.createFunction(
  { 
    id: 'workflow-execute-worker',
    triggers: [{ event: 'workflow.execute' }],
    concurrency: {
      limit: 10,
      key: 'event.data.tenantId' // Prevent API limits from being exhausted by a single tenant
    },
    onFailure: async ({ event, error }) => {
      const { getFailureEventIdSafe, sendToDeadLetterQueue } = await import('../worker');
      const safeEvent = event as { data: { event: { data: unknown, attemptCount?: number } } };
      const originalEvent = safeEvent.data.event;
      const envelope = originalEvent.data as SecureJobEnvelope<any>;
      if (envelope && envelope.tenantId) {
        const eventId = getFailureEventIdSafe(event);
        await sendToDeadLetterQueue(envelope, new Error(error.message), originalEvent.attemptCount ?? 1, eventId);
      }
    },
  },
  async ({ event, step }: { event: { data: SecureJobEnvelope<{ workflowId: string, executionId: string }> }, step: any }) => {
    const { workflowId, executionId } = event.data.payload;
    const tenantId = event.data.tenantId;

    const actions = await step.run('get-workflow-actions', async () => {
      return await WorkflowService.getWorkflowActions(tenantId, workflowId, executionId);
    });

    for (const action of actions) {
      // Execute the action, which handles atomicity and idempotency internally
      const result = await step.run(`execute-action-${action.id}`, async () => {
        return await WorkflowService.executeAction(tenantId, workflowId, executionId, action);
      });

      if (result.waitingApproval) {
        // Wait for the approval event WAKE-UP
        const approvalEvent = await step.waitForEvent(`wait-approval-${action.id}`, {
          event: 'workflow.approval',
          timeout: '7d',
          match: 'data.payload.executionId',
        });

        if (!approvalEvent) {
          await step.run(`mark-failed-timeout-${action.id}`, async () => {
             await WorkflowService.markExecutionFailed(tenantId, executionId, 'Approval timeout');
          });
          return;
        }

        // On wake up, we just execute again! executeAction will reload DB auth and verify.
        await step.run(`execute-action-resume-${action.id}`, async () => {
           return await WorkflowService.executeAction(tenantId, workflowId, executionId, action);
        });
      }
    }

    await step.run('complete-execution', async () => {
      await WorkflowService.markExecutionCompleted(tenantId, executionId);
    });
  }
);
