import { describe, it, expect } from 'vitest';
import { withContext, getContext } from '@/lib/observability/context';

describe('S15.2 FND-15-04: AsyncLocalStorage Correlation Context', () => {
  it('STRONG: preserves absence of requestId when generic context established without one', () => {
    withContext({}, () => {
      const ctx = getContext();
      expect(ctx?.requestId).toBeUndefined();
    });
  });

  it('STRONG: uses provided valid requestId', () => {
    const customId = 'req-12345';
    withContext({ requestId: customId }, () => {
      const ctx = getContext();
      expect(ctx?.requestId).toBe(customId);
    });
  });

  it('STRONG: omits invalid or oversized requestId', () => {
    const invalidId = 'a'.repeat(100); // Oversized (max 64)
    withContext({ requestId: invalidId }, () => {
      const ctx = getContext();
      expect(ctx?.requestId).toBeUndefined();
    });
  });

  it('STRONG: ensures concurrent contexts do not leak', async () => {
    const results: string[] = [];

    const task1 = new Promise<void>((resolve) => {
      withContext({ requestId: 'context-1' }, () => {
        setTimeout(() => {
          results.push(getContext()?.requestId || '');
          resolve();
        }, 10);
      });
    });

    const task2 = new Promise<void>((resolve) => {
      withContext({ requestId: 'context-2' }, () => {
        setTimeout(() => {
          results.push(getContext()?.requestId || '');
          resolve();
        }, 5);
      });
    });

    await Promise.all([task1, task2]);
    // The order of completion is task2 then task1 due to timeouts
    expect(results).toEqual(['context-2', 'context-1']);
  });
});
