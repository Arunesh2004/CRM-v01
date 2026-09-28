import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/auth/me/route';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { randomUUID } from 'crypto';
import * as authLib from '@/lib/auth';

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof authLib>();
  return {
    ...actual,
    getCurrentUserIdentity: vi.fn(),
  };
});

describe('Phase 1: /api/auth/me Contract Validation', () => {
  const mockTenantId = randomUUID();
  const mockUserId = randomUUID();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 when unauthenticated', async () => {
    vi.mocked(authLib.getCurrentUserIdentity).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/auth/me');
    const res = await GET();

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return expected identity fields when authenticated without exposing sensitive fields', async () => {
    const mockUser = {
      id: mockUserId,
      tenantId: mockTenantId,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      passwordHash: 'secret-hash',
    } as any;

    vi.mocked(authLib.getCurrentUserIdentity).mockResolvedValue(mockUser);

    const req = new NextRequest('http://localhost/api/auth/me');
    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();

    // Must include the 3 new fields
    expect(data.email).toBe('test@example.com');
    expect(data.firstName).toBe('Test');
    expect(data.lastName).toBe('User');

    // Must preserve the 3 existing fields
    expect(data.id).toBe(mockUserId);
    expect(data.tenantId).toBe(mockTenantId);
    expect(data.status).toBe('ACTIVE');

    // Must not expose sensitive fields
    expect(data.passwordHash).toBeUndefined();
    expect(data.clerkId).toBeUndefined();
  });
});
