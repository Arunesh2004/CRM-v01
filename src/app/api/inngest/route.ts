import { serve } from 'inngest/next';
import { inngest } from '@/lib/queue/inngest.client';
import { dataRetentionCron } from '@/modules/core/jobs/retention.job';

// Export the API handler for Inngest to reach our app
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dataRetentionCron,
    // Future AI and email jobs go here
  ],
});
