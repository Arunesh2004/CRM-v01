import { NextRequest } from 'next/server';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import crypto from 'crypto';
import { POST } from '@/app/api/auth/accept-invite/route';

// Mock Clerk NextJS auth and clerkClient
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from '@clerk/nextjs/server';

describe('Identity & Onboarding API Redemption Security', () => {
  let tenantId: string;
  let tenant2Id: string;
  let roleId: string;
  
  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      const t = await tx.tenant.create({ data: { name: 'Redemption Tenant' } });
      tenantId = t.id;

      const t2 = await tx.tenant.create({ data: { name: 'Other Tenant' } });
      tenant2Id = t2.id;

      const rMember = await tx.role.create({ data: { name: 'MEMBER', tenantId } });
      roleId = rMember.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      await tx.userRole.deleteMany({ where: { tenantId } });
      await tx.userInvitation.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.role.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
      await tx.tenant.delete({ where: { id: tenant2Id } });
    });
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  };

  const setupClerkMock = (userId: string | null, emails: string[] = [], verified: boolean = true) => {
    (auth as any).mockResolvedValue({ userId });
    (clerkClient as any).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: userId,
          emailAddresses: emails.map(e => ({ emailAddress: e, verification: { status: verified ? 'verified' : 'unverified' } }))
        })
      }
    });
  };

  it('G. Unverified Clerk email is rejected', async () => {
    setupClerkMock('clerk_1', ['unverified@test.com'], false);
    const req = createRequest({ token: 'sometoken' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('No verified email found in Clerk account');
  });

  it('F & H. Email mismatch is rejected', async () => {
    // Generate valid invitation
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      await tx.userInvitation.create({
        data: {
          tenantId,
          email: 'invited@test.com',
          roleId,
          tokenHash,
          expiresAt: new Date(Date.now() + 86400000), 
          status: 'PENDING'
        }
      });
    });

    setupClerkMock('clerk_diff', ['other@test.com'], true);
    const req = createRequest({ token });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Clerk email does not match the invited email or is unverified');
  });

  it('D. Concurrency race conditions (Double redemption attempt)', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      await tx.userInvitation.create({
        data: {
          tenantId,
          email: 'concurrent@test.com',
          roleId,
          tokenHash,
          expiresAt: new Date(Date.now() + 86400000), 
          status: 'PENDING'
        }
      });
    });

    setupClerkMock('clerk_conc', ['concurrent@test.com'], true);
    
    // Fire two requests concurrently
    const req1 = createRequest({ token });
    const req2 = createRequest({ token });

    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);
    
    // One must succeed, one must fail because status changes or user created
    const status1 = res1.status;
    const status2 = res2.status;
    
    expect([status1, status2]).toContain(200);
    expect([status1, status2]).toContain(400);
  });
});
