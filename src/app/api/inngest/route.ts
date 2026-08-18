import { serve } from 'inngest/next';
import { inngest } from '@/lib/queue/inngest.client';
import { dataRetentionCron } from '@/modules/core/jobs/retention.job';

import { slaEvaluateCron, slaEvaluateWorker } from '@/lib/queue/functions/sla.cron';
import { aiScoringWorker } from '@/lib/queue/functions/ai.scoring';
import { outboxWorker } from '@/lib/queue/functions/outbox.worker';
import { webhookWorker } from '@/lib/queue/functions/webhook.worker';

// Export the API handler for Inngest to reach our app
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dataRetentionCron,
    slaEvaluateCron,
    slaEvaluateWorker,
    aiScoringWorker,
    outboxWorker,
    webhookWorker,
  ],
});
