import { inngest } from '../inngest.client';
import { withJobContext } from '../worker';
import { DocumentProviderFactory } from '../../providers/document/document-provider.factory';
import { uploadFile } from '../../providers/storage/s3.provider';
import prisma from '../../../../database/utils/prisma';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const quoteApprovedWorker = inngest.createFunction(
  {
    id: 'quote-approved-worker',
    triggers: [{ event: 'QUOTE_APPROVED' }],
    concurrency: { limit: 10, key: 'event.data.tenantId' }
  },
  async ({ event, step }) => {
    return await step.run('process-quote-approval', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      return await withJobContext(event.data as any, async (tx, payload) => {
        const quoteId = payload.metadata.quoteId;
        const tenantId = event.data.tenantId;
        
        // 1. Fetch Quote and relationships for Snapshot
        const quote = await tx.quote.findFirst({
          where: { id: quoteId, tenantId },
          include: {
            lineItems: true,
            tenant: true,
            customer: true,
            owner: true
          }
        });
        
        if (!quote) throw new Error('Quote not found');

        // 2. Generate PDF
        const docProvider = DocumentProviderFactory.getProvider();
        const pdfBytes = await docProvider.generateQuoteDocument({
          quote,
          lineItems: quote.lineItems,
          tenant: quote.tenant,
          customer: quote.customer,
          owner: quote.owner
        });

        // 3. Store PDF
        const tmpFilePath = path.join(os.tmpdir(), `quote_${quote.id}.pdf`);
        fs.writeFileSync(tmpFilePath, pdfBytes);
        const storageKey = `quotes/${tenantId}/${quote.id}/quote.pdf`;
        
        try {
          await uploadFile(tmpFilePath, storageKey, 'application/pdf');
        } finally {
          if (fs.existsSync(tmpFilePath)) {
            fs.unlinkSync(tmpFilePath);
          }
        }

        // We defer Payment creation logic as instructed (Phase 6 priority)
        // If Payment Link is required, we would generate a Stripe Session here.

        return { success: true, storageKey };
      });
    });
  }
);
