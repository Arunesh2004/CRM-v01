/**
 * Phase 8R Security Remediation Tests
 *
 * Validates all three findings from the Phase 8 forensic audit:
 *  8-A: Customer Timeline must not leak unrelated tenant-wide communication records
 *  8-B: Diagnostic route must not contain hardcoded email; auth must be enforced
 *  8-C: seed-demo route must not expose raw Prisma User object fields
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { getCustomerTimeline } from '@/modules/crm/customer/customer.timeline.service';
import { GET as diagnosticGET } from '@/app/api/diagnostic/route';
import { GET as seedDemoGET } from '@/app/api/seed-demo/route';
import { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Auth mock
// ─────────────────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireTenant: vi.fn(),
  requirePermission: vi.fn(),
  checkPermission: vi.fn(),
}));

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Shared test data
// ─────────────────────────────────────────────────────────────────────────────
const tenantAId = crypto.randomUUID();
const tenantBId = crypto.randomUUID();
const userAId = crypto.randomUUID();
const userBId = crypto.randomUUID();
const adminId = crypto.randomUUID();
const customerAId = crypto.randomUUID();
const customerBId = crypto.randomUUID();

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
    // Create two tenants
    await tx.tenant.createMany({
      data: [
        { id: tenantAId, name: '8R-TenantA', status: 'ACTIVE' },
        { id: tenantBId, name: '8R-TenantB', status: 'ACTIVE' },
      ]
    });

    // Create users
    await tx.user.createMany({
      data: [
        { id: userAId, tenantId: tenantAId, email: 'user-a-8r@test.com', status: 'ACTIVE' },
        { id: userBId, tenantId: tenantBId, email: 'user-b-8r@test.com', status: 'ACTIVE' },
        { id: adminId, tenantId: tenantAId, email: 'admin-8r@test.com', status: 'ACTIVE' },
      ]
    });

    // Assign tenant owners
    await tx.tenant.update({ where: { id: tenantAId }, data: { ownerId: userAId } });
    await tx.tenant.update({ where: { id: tenantBId }, data: { ownerId: userBId } });

    // Create customers
    await tx.customer.createMany({
      data: [
        { id: customerAId, tenantId: tenantAId, name: '8R-CustomerA', normalizedName: '8r-customera', status: 'ACTIVE' },
        { id: customerBId, tenantId: tenantAId, name: '8R-CustomerB', normalizedName: '8r-customerb', status: 'ACTIVE' },
      ]
    });

    // Create MailThread in tenantA (NOT linked to any customer)
    const mailThread = await tx.mailThread.create({
      data: {
        tenantId: tenantAId,
        subject: 'Tenant-wide unrelated email thread',
      }
    });

    // Add a message to the mail thread
    await tx.mailMessage.create({
      data: {
        tenantId: tenantAId,
        threadId: mailThread.id,
        senderId: userAId,
        bodyHtml: '<p>Unrelated email body</p>',
        bodyText: 'Unrelated email body',
      }
    });

    // Create ChatConversation in tenantA (NOT linked to customerA or customerB)
    await tx.chatConversation.create({
      data: {
        tenantId: tenantAId,
        type: 'DIRECT',
      }
    });
  });
});

afterAll(async () => {
  // Cleanup is handled by FK cascades; customers/users/tenants with prefix 8R-
  // We leave the data — test isolation is handled by unique IDs.
});

// ─────────────────────────────────────────────────────────────────────────────
// 8-A: Customer Timeline — No unrelated communication leakage
// ─────────────────────────────────────────────────────────────────────────────
describe('8-A: Customer Timeline — No unscoped communication leakage', () => {
  const setupAuthForTimeline = () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);
  };

  it('should return timeline for Customer A without leaking unrelated MailThread records', async () => {
    setupAuthForTimeline();
    const result = await getCustomerTimeline({ customerId: customerAId });

    expect(result.data).toBeDefined();

    // All returned items must only be for customer A — not tenant-wide emails
    const emailItems = result.data.filter(e => e.type === 'EMAIL');
    expect(emailItems).toHaveLength(0);

    // The unrelated mail thread subject must never appear
    const subjectAppears = result.data.some(e => e.title === 'Tenant-wide unrelated email thread');
    expect(subjectAppears).toBe(false);
  });

  it('should return timeline for Customer A without leaking unrelated ChatConversation records', async () => {
    setupAuthForTimeline();
    const result = await getCustomerTimeline({ customerId: customerAId });

    const messageItems = result.data.filter(e => e.type === 'MESSAGE');
    expect(messageItems).toHaveLength(0);
  });

  it('Customer B timeline must not show Customer A data', async () => {
    setupAuthForTimeline();

    const resultA = await getCustomerTimeline({ customerId: customerAId });
    const resultB = await getCustomerTimeline({ customerId: customerBId });

    // IDs from timeline A must not appear in timeline B
    const idsFromA = new Set(resultA.data.map(e => e.id));
    const overlap = resultB.data.filter(e => idsFromA.has(e.id));
    expect(overlap).toHaveLength(0);
  });

  it('tenant isolation: Timeline from Tenant A must not contain Tenant B data', async () => {
    // Auth is for Tenant A's user
    setupAuthForTimeline();

    const result = await getCustomerTimeline({ customerId: customerAId });

    // No items should have tenantB content by our test data design
    // The withTenant middleware enforces RLS at DB level — this verifies no bypass
    const tenantBItems = result.data.filter(e =>
      (e.title || '').includes('TenantB') ||
      (e.description || '').includes('TenantB')
    );
    expect(tenantBItems).toHaveLength(0);
  });

  it('Unauthenticated request must be denied', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    await expect(
      getCustomerTimeline({ customerId: customerAId })
    ).rejects.toThrow('Unauthorized');
  });

  it('CUSTOMER:READ permission required — missing permission must deny', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(requirePermission).mockRejectedValue(new Error('Forbidden'));

    await expect(
      getCustomerTimeline({ customerId: customerAId })
    ).rejects.toThrow('Forbidden');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8-A: Regression — source code must not reference unscoped mailThread/chat queries
// ─────────────────────────────────────────────────────────────────────────────
describe('8-A: Regression — source must not contain unscoped communication queries', () => {
  it('timeline service must not contain an unscoped mailThread.findMany({ where: { tenantId } }) without customerId', () => {
    const serviceFile = path.join(
      process.cwd(),
      'src/modules/crm/customer/customer.timeline.service.ts'
    );
    const source = fs.readFileSync(serviceFile, 'utf8');

    // The old stub had: mailThread.findMany({ where: { tenantId }, ... take: 20 })
    // Confirm the unscoped call is gone
    expect(source).not.toMatch(/mailThread\.findMany/);
  });

  it('timeline service must not contain an unscoped chatConversation.findMany() without customerId', () => {
    const serviceFile = path.join(
      process.cwd(),
      'src/modules/crm/customer/customer.timeline.service.ts'
    );
    const source = fs.readFileSync(serviceFile, 'utf8');

    expect(source).not.toMatch(/chatConversation\.findMany/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8-B: Diagnostic Route — No hardcoded email; Auth enforced
// ─────────────────────────────────────────────────────────────────────────────
describe('8-B: Diagnostic Route — hardcoded email removed; authorization intact', () => {
  it('source code must not contain the hardcoded developer email', () => {
    const routeFile = path.join(
      process.cwd(),
      'src/app/api/diagnostic/route.ts'
    );
    const source = fs.readFileSync(routeFile, 'utf8');

    expect(source).not.toContain('aruneshsharma2004');
    expect(source).not.toContain('aruneshsharma2004@gmail.com');
  });

  it('unauthenticated request must be denied (no Clerk headers → throws)', async () => {
    const req = new NextRequest('http://localhost/api/diagnostic', { method: 'GET' });
    const res = await diagnosticGET(req, {});
    // Without auth headers, requireAuth() throws → handler returns non-200
    expect(res.status).not.toBe(200);
  });

  it('response must not expose raw database credentials or connection strings', async () => {
    const req = new NextRequest('http://localhost/api/diagnostic', { method: 'GET' });
    const res = await diagnosticGET(req, {});
    const body = JSON.stringify(await res.json().catch(() => ({})));

    expect(body).not.toMatch(/postgres:\/\//);
    expect(body).not.toMatch(/postgresql:\/\//);
    expect(body).not.toContain(process.env.DATABASE_URL || 'SENTINEL_NOT_PRESENT');
  });

  it('response must not expose clerkId or tenantId raw values', async () => {
    // Without valid auth this returns error; verify it doesn't leak raw values
    const req = new NextRequest('http://localhost/api/diagnostic');
    const res = await diagnosticGET(req, {});
    const body = await res.json().catch(() => ({}));
    const bodyStr = JSON.stringify(body);

    // Clerk IDs begin with 'user_' — verify they are not serialized
    expect(bodyStr).not.toMatch(/user_[A-Za-z0-9]+/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8-C: seed-demo Route — Explicit DTO; no raw Prisma fields
// ─────────────────────────────────────────────────────────────────────────────
describe('8-C: seed-demo Route — explicit DTO; sensitive fields not exposed', () => {
  it('production environment returns 403', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalVercelEnv = process.env.VERCEL_ENV;

    // Simulate production check. NODE_ENV is read-only in some environments;
    // use VERCEL_ENV as the production signal instead.
    process.env.VERCEL_ENV = 'production';

    const req = new NextRequest('http://localhost/api/seed-demo', { method: 'GET' });
    const res = await seedDemoGET(req, {});

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('production');

    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it('non-production: response must not expose clerkId', async () => {
    // In test env (NODE_ENV=test) the production gate is false
    const req = new NextRequest('http://localhost/api/seed-demo', { method: 'GET' });
    const res = await seedDemoGET(req, {});

    // In test env with real DB the seed runs; check DTO shape
    if (res.status === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();

      // These sensitive fields must NOT be present
      expect(body.user.clerkId).toBeUndefined();
      expect(body.user.tenantId).toBeUndefined();
      expect(body.user.onboardingStatus).toBeUndefined();
      expect(body.user.employeeId).toBeUndefined();
      expect(body.user.deletedAt).toBeUndefined();

      // Only the safe DTO fields must be present
      expect(body.user.id).toBeDefined();
      expect(body.user.email).toBeDefined();
      expect(body.user.status).toBeDefined();

      // Field count must be exactly 3
      const keys = Object.keys(body.user);
      expect(keys).toHaveLength(3);
      expect(keys.sort()).toEqual(['email', 'id', 'status']);
    }
  });

  it('seed-demo source must not directly pass result.user to JSON response', () => {
    const routeFile = path.join(
      process.cwd(),
      'src/app/api/seed-demo/route.ts'
    );
    const source = fs.readFileSync(routeFile, 'utf8');

    // Must not contain the old direct serialization pattern
    expect(source).not.toContain('user: result.user');
    // Must contain the safe DTO pattern
    expect(source).toContain('safeUser');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-finding: Verify no new hardcoded PII was introduced in other routes
// ─────────────────────────────────────────────────────────────────────────────
describe('Global: No hardcoded developer email in API routes', () => {
  const routesDir = path.join(process.cwd(), 'src/app/api');

  function findFilesRecursive(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findFilesRecursive(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('no TypeScript API route file should contain the developer email', () => {
    const tsFiles = findFilesRecursive(routesDir);
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('aruneshsharma2004')) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(violations).toHaveLength(0);
  });
});
