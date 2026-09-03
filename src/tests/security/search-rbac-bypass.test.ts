import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { randomUUID } from 'crypto';
import { searchAction } from '@/modules/search/actions/search.actions';
import * as authLib from '@/lib/auth';

describe('Phase 7R: Search RBAC Bypass Remediation', () => {
  const tenantId = randomUUID();
  const tenantBId = randomUUID();
  const unprivilegedUserId = randomUUID();
  const mixedUserId = randomUUID();
  const fullUserId = randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Create Tenants
      await tx.tenant.create({ data: { id: tenantId, name: 'Search Test Tenant A' } });
      await tx.tenant.create({ data: { id: tenantBId, name: 'Search Test Tenant B' } });

      // Create Users
      await tx.user.create({
        data: { id: unprivilegedUserId, email: 'unprivileged_search@test.com', tenantId, status: 'ACTIVE' },
      });
      await tx.user.create({
        data: { id: mixedUserId, email: 'mixed_search@test.com', tenantId, status: 'ACTIVE' },
      });
      await tx.user.create({
        data: { id: fullUserId, email: 'full_search@test.com', tenantId, status: 'ACTIVE' },
      });

      // Create sensitive customer in Tenant A
      await tx.customer.create({
        data: { name: 'Super Secret Enterprise Client', normalizedName: 'super secret enterprise client', industry: 'Defense', tenantId }
      });
      // Create sensitive lead in Tenant A
      await tx.lead.create({
        data: { name: 'CEO', company: 'Secret Project X', email: 'ceo@secret.com', tenantId }
      });
      // Create sensitive task in Tenant A
      await tx.task.create({
        data: { title: 'Destroy Secret Evidence', tenantId }
      });
      
      // Create sensitive mail in Tenant A
      const mailThreadId = randomUUID();
      await tx.mailThread.create({
        data: { id: mailThreadId, tenantId, subject: 'Secret Merger' }
      });
      await tx.mailMessage.create({
        data: { tenantId, threadId: mailThreadId, senderId: fullUserId, bodyText: 'Secret emails regarding merger' }
      });

      // Create sensitive invoice in Tenant A
      await tx.invoice.create({
        data: { id: 'INV-SECRET-100', tenantId, amountDue: 1000000 }
      });

      // Create sensitive customer in Tenant B
      await tx.customer.create({
        data: { name: 'Tenant B Top Secret', normalizedName: 'tenant b top secret', industry: 'Intelligence', tenantId: tenantBId }
      });
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.invoice.deleteMany({ where: { tenantId } });
      await tx.mailMessage.deleteMany({ where: { tenantId } });
      await tx.mailThread.deleteMany({ where: { tenantId } });
      await tx.task.deleteMany({ where: { tenantId } });
      await tx.lead.deleteMany({ where: { tenantId } });
      await tx.customer.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.tenant.deleteMany({ where: { id: tenantId } });

      await tx.customer.deleteMany({ where: { tenantId: tenantBId } });
      await tx.tenant.deleteMany({ where: { id: tenantBId } });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('G. User with no CRM READ permissions performs global search', async () => {
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({ id: unprivilegedUserId, tenantId, userRoles: [] } as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantId);
    vi.spyOn(authLib, 'checkPermissionFast').mockResolvedValue(false);

    const result = await searchAction('Secret');
    expect(result.success).toBe(true);
    
    const data = result.data as any[];
    expect(data.filter(d => d.type === 'CUSTOMER').length).toBe(0);
    expect(data.filter(d => d.type === 'LEAD').length).toBe(0);
    expect(data.filter(d => d.type === 'TASK').length).toBe(0);
    expect(data.filter(d => d.type === 'MESSAGE').length).toBe(0);
    expect(data.filter(d => d.type === 'INVOICE').length).toBe(0);
  });

  it('H. User with CUSTOMER:READ but not LEAD:READ or TASK:READ', async () => {
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({ id: mixedUserId, tenantId, userRoles: [] } as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantId);
    vi.spyOn(authLib, 'checkPermissionFast').mockImplementation(async (uid, resource, action) => {
      return resource === 'CUSTOMER' && action === 'READ';
    });

    const result = await searchAction('Secret');
    expect(result.success).toBe(true);
    
    const data = result.data as any[];
    expect(data.filter(d => d.type === 'CUSTOMER').length).toBeGreaterThan(0);
    expect(data.filter(d => d.type === 'LEAD').length).toBe(0);
    expect(data.filter(d => d.type === 'TASK').length).toBe(0);
    expect(data.filter(d => d.type === 'MESSAGE').length).toBe(0);
    expect(data.filter(d => d.type === 'INVOICE').length).toBe(0);
  });

  it('A, C, E. User with all READ permissions can search all records', async () => {
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({ id: fullUserId, tenantId, userRoles: [] } as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantId);
    vi.spyOn(authLib, 'checkPermissionFast').mockResolvedValue(true);

    const result = await searchAction('Secret');
    expect(result.success).toBe(true);
    
    const data = result.data as any[];
    expect(data.filter(d => d.type === 'CUSTOMER').length).toBeGreaterThan(0);
    expect(data.filter(d => d.type === 'LEAD').length).toBeGreaterThan(0);
    expect(data.filter(d => d.type === 'TASK').length).toBeGreaterThan(0);
    expect(data.filter(d => d.type === 'MESSAGE').length).toBeGreaterThan(0);
    expect(data.filter(d => d.type === 'INVOICE').length).toBeGreaterThan(0);
  });

  it('J. COMMUNICATION and REVENUE permissions selectively', async () => {
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({ id: mixedUserId, tenantId, userRoles: [] } as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantId);
    vi.spyOn(authLib, 'checkPermissionFast').mockImplementation(async (uid, resource, action) => {
      return (resource === 'COMMUNICATION' || resource === 'REVENUE') && action === 'READ';
    });

    const result = await searchAction('Secret');
    expect(result.success).toBe(true);
    
    const data = result.data as any[];
    expect(data.filter(d => d.type === 'CUSTOMER').length).toBe(0);
    expect(data.filter(d => d.type === 'MESSAGE').length).toBeGreaterThan(0);
    expect(data.filter(d => d.type === 'INVOICE').length).toBeGreaterThan(0);
  });

  it('I. Tenant isolation: Tenant A user searches for Tenant B data', async () => {
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({ id: fullUserId, tenantId, userRoles: [] } as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantId);
    vi.spyOn(authLib, 'checkPermissionFast').mockResolvedValue(true);

    const result = await searchAction('Tenant B');
    expect(result.success).toBe(true);
    
    const data = result.data as any[];
    expect(data.filter(d => d.title.includes('Tenant B')).length).toBe(0); // Should return 0 due to RLS/withTenant
  });
});
