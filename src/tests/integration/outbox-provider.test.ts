import { describe, it, expect, vi, beforeEach } from 'vitest';
import { outboxWorker, outboxWorkerHandler } from '../../lib/queue/functions/outbox.worker';
import { ProviderFactory } from '../../lib/providers/provider.factory';
import { EventBus } from '../../modules/core/events/event-bus';

// Mock ProviderFactory
vi.mock('../../lib/providers/provider.factory', () => ({
  ProviderFactory: {
    getEmailProvider: vi.fn(),
    getTelephonyProvider: vi.fn(),
  }
}));

// Mock withJobContext to just run the callback
vi.mock('../../lib/queue/worker', () => ({
  withJobContext: vi.fn(async (data, cb) => {
    return await cb({
      camera: { findFirst: vi.fn() },
      incident: { create: vi.fn() },
      activityTimeline: { create: vi.fn() },
      notification: { create: vi.fn() }
    }, data.payload);
  })
}));

describe('Outbox Worker Integration (Communication E2E)', () => {
  let mockEmailProvider: any;
  let mockTelephonyProvider: any;

  beforeEach(() => {
    mockEmailProvider = { sendEmail: vi.fn().mockResolvedValue({ success: true }) };
    mockTelephonyProvider = { 
       sendSms: vi.fn().mockResolvedValue({ success: true }),
       initiateCall: vi.fn().mockResolvedValue({ success: true })
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ProviderFactory.getEmailProvider as any).mockReturnValue(mockEmailProvider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ProviderFactory.getTelephonyProvider as any).mockReturnValue(mockTelephonyProvider);
    
    vi.clearAllMocks();
  });

  it('SHOULD dispatch SEND_EMAIL using ProviderFactory with Idempotency-Key', async () => {
    // Inngest function test wrapper (mocking step.run)
    const mockStep = { run: vi.fn(async (name, cb) => await cb()) };
    
    const event = {
      data: {
        jobId: 'event-outbox-123',
        tenantId: 'tenant-1',
        jobType: 'SEND_EMAIL',
        payload: { to: 'test@example.com', subject: 'Hello' }
      }
    };
    
    await outboxWorkerHandler({ event, step: mockStep } as any);

    expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      to: 'test@example.com',
      headers: expect.objectContaining({
        'Idempotency-Key': 'event-outbox-123'
      })
    }));
  });

  it('SHOULD throw NonRetriableError for permanent email failures', async () => {
    mockEmailProvider.sendEmail.mockResolvedValue({ success: false, error: 'invalid_email format' });

    const mockStep = { run: vi.fn(async (name, cb) => await cb()) };
    const event = {
      data: {
        jobId: 'event-outbox-123',
        tenantId: 'tenant-1',
        jobType: 'SEND_EMAIL',
        payload: { to: 'bad' }
      }
    };
    
    await expect(outboxWorkerHandler({ event, step: mockStep } as any)).rejects.toThrow(/Permanent email failure/);
  });

  it('SHOULD throw normal Error for transient email failures to trigger Inngest retry', async () => {
    mockEmailProvider.sendEmail.mockResolvedValue({ success: false, error: 'network_timeout' });

    const mockStep = { run: vi.fn(async (name, cb) => await cb()) };
    const event = {
      data: {
        jobId: 'event-outbox-123',
        tenantId: 'tenant-1',
        jobType: 'SEND_EMAIL',
        payload: { to: 'test@example.com' }
      }
    };
    
    await expect(outboxWorkerHandler({ event, step: mockStep } as any)).rejects.toThrow('Transient email failure: network_timeout');
  });

  it('SHOULD dispatch SEND_SMS and pass idempotencyKey to provider adapter', async () => {
    const mockStep = { run: vi.fn(async (name, cb) => await cb()) };
    const event = {
      data: {
        jobId: 'event-outbox-123',
        tenantId: 'tenant-1',
        jobType: 'SEND_SMS',
        payload: { to: '+123456', body: 'Test' }
      }
    };
    
    await outboxWorkerHandler({ event, step: mockStep } as any);

    expect(mockTelephonyProvider.sendSms).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      to: '+123456',
      idempotencyKey: 'event-outbox-123'
    }));
  });

  it('SHOULD prevent duplicate provider operations if worker crashes after success', async () => {
    // If the provider supports idempotency keys (like Resend), a retry with the same jobId
    // will be ignored by the provider. The test verifies the ID is deterministically passed.
    const mockStep = { run: vi.fn(async (name, cb) => await cb()) };
    const event = {
      data: {
        jobId: 'crash-recovery-123',
        tenantId: 'tenant-1',
        jobType: 'SEND_EMAIL',
        payload: { to: 'test@example.com' }
      }
    };
    
    await outboxWorkerHandler({ event, step: mockStep } as any);
    
    // The exact idempotency key is what prevents duplicate external sends on Inngest retry
    expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      headers: { 'Idempotency-Key': 'crash-recovery-123' }
    }));
  });
});
