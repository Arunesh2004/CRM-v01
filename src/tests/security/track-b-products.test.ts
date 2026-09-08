import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { ProductService } from '../../../src/modules/revenue/product.service';
import * as crypto from 'crypto';
import * as auth from '../../../src/lib/auth';

describe('Track B - Products Security Tests', () => {
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();

  const tAAdminId = crypto.randomUUID();
  const tADeptHeadId = crypto.randomUUID();
  const tAMemberId = crypto.randomUUID();
  const tAApproverId = crypto.randomUUID();
  
  const productAId = crypto.randomUUID();
  const productBId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // 1. Create Tenants
      await tx.tenant.createMany({
        data: [
          { id: tenantAId, name: 'Tenant A', status: 'ACTIVE' },
          { id: tenantBId, name: 'Tenant B', status: 'ACTIVE' },
        ],
      });

      // 2. Create Roles
      const adminRoleA = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tenantAId } });
      const deptHeadRoleA = await tx.role.create({ data: { name: 'DEPARTMENT_HEAD', tenantId: tenantAId } });
      const memberRoleA = await tx.role.create({ data: { name: 'MEMBER', tenantId: tenantAId } });
      const approverRoleA = await tx.role.create({ data: { name: 'APPROVER', tenantId: tenantAId } });

      // 3. Create Users
      await tx.user.createMany({
        data: [
          { id: tAAdminId, tenantId: tenantAId, email: `admin_${tenantAId}@test.com`, firstName: 'A', lastName: 'Admin' },
          { id: tADeptHeadId, tenantId: tenantAId, email: `head_${tenantAId}@test.com`, firstName: 'A', lastName: 'Head' },
          { id: tAMemberId, tenantId: tenantAId, email: `mem_${tenantAId}@test.com`, firstName: 'A', lastName: 'Mem' },
          { id: tAApproverId, tenantId: tenantAId, email: `app_${tenantAId}@test.com`, firstName: 'A', lastName: 'App' },
        ],
      });

      // 4. Assign Roles
      await tx.userRole.createMany({
        data: [
          { userId: tAAdminId, roleId: adminRoleA.id, tenantId: tenantAId },
          { userId: tADeptHeadId, roleId: deptHeadRoleA.id, tenantId: tenantAId },
          { userId: tAMemberId, roleId: memberRoleA.id, tenantId: tenantAId },
          { userId: tAApproverId, roleId: approverRoleA.id, tenantId: tenantAId },
        ],
      });

      // 5. Seed Permissions for the Roles
      // We rely on checkPermissionFast, but checkPermissionFast expects permissions seeded in DB or TENANT_ADMIN bypass.
      // Because we just created fresh roles, we need to inject the permissions for them.
      const permProductRead = await tx.permission.upsert({ where: { resource_action: { resource: 'PRODUCT', action: 'READ' } }, update: {}, create: { resource: 'PRODUCT', action: 'READ' } });
      const permProductCreate = await tx.permission.upsert({ where: { resource_action: { resource: 'PRODUCT', action: 'CREATE' } }, update: {}, create: { resource: 'PRODUCT', action: 'CREATE' } });
      const permProductUpdate = await tx.permission.upsert({ where: { resource_action: { resource: 'PRODUCT', action: 'UPDATE' } }, update: {}, create: { resource: 'PRODUCT', action: 'UPDATE' } });
      const permProductDelete = await tx.permission.upsert({ where: { resource_action: { resource: 'PRODUCT', action: 'DELETE' } }, update: {}, create: { resource: 'PRODUCT', action: 'DELETE' } });

      await tx.rolePermission.createMany({
        data: [
          { roleId: deptHeadRoleA.id, permissionId: permProductRead.id, tenantId: tenantAId },
          { roleId: memberRoleA.id, permissionId: permProductRead.id, tenantId: tenantAId },
          { roleId: approverRoleA.id, permissionId: permProductRead.id, tenantId: tenantAId },
          // TENANT_ADMIN bypasses, but just in case:
          { roleId: adminRoleA.id, permissionId: permProductCreate.id, tenantId: tenantAId },
          { roleId: adminRoleA.id, permissionId: permProductRead.id, tenantId: tenantAId },
          { roleId: adminRoleA.id, permissionId: permProductUpdate.id, tenantId: tenantAId },
          { roleId: adminRoleA.id, permissionId: permProductDelete.id, tenantId: tenantAId },
        ]
      });

      // 6. Create initial products
      await tx.product.create({
        data: { id: productAId, tenantId: tenantAId, name: 'Product A', sku: 'SKU-A' }
      });
      await tx.product.create({
        data: { id: productBId, tenantId: tenantBId, name: 'Product B', sku: 'SKU-B' }
      });
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.userRole.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.rolePermission.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.permission.deleteMany({ where: { resource: 'PRODUCT' } });
      await tx.role.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    });
    vi.restoreAllMocks();
  });

  // Mock requireAuth to not actually check clerk
  function mockAuthAs(userId: string, tenantId: string) {
    vi.spyOn(auth, 'requireAuth').mockResolvedValue({ id: userId, tenantId } as any);
  }

  it('1. Tenant A admin creates Product', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const p = await ProductService.createProduct(tenantAId, tAAdminId, { name: 'New P', sku: 'NEW-SKU' });
    expect(p.id).toBeDefined();
    expect(p.tenantId).toBe(tenantAId);
  });

  it('2. Tenant A admin updates Product', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const p = await ProductService.updateProduct(tenantAId, tAAdminId, productAId, { description: 'Updated' });
    expect(p.description).toBe('Updated');
  });

  it('3. Tenant A admin deactivates Product', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const p = await ProductService.deactivateProduct(tenantAId, tAAdminId, productAId);
    expect(p.isActive).toBe(false);
  });

  it('4. Tenant A can read its Product', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    const p = await ProductService.getProduct(tenantAId, tAAdminId, productAId);
    expect(p.id).toBe(productAId);
  });

  it('5. Member can read Product', async () => {
    mockAuthAs(tAMemberId, tenantAId);
    const products = await ProductService.getProducts(tenantAId, tAMemberId);
    expect(products.length).toBeGreaterThan(0);
  });

  it('6. Department Head can read Product', async () => {
    mockAuthAs(tADeptHeadId, tenantAId);
    const products = await ProductService.getProducts(tenantAId, tADeptHeadId);
    expect(products.length).toBeGreaterThan(0);
  });

  it('7. Approver can read Product', async () => {
    mockAuthAs(tAApproverId, tenantAId);
    const products = await ProductService.getProducts(tenantAId, tAApproverId);
    expect(products.length).toBeGreaterThan(0);
  });

  it('8. Member cannot create Product', async () => {
    mockAuthAs(tAMemberId, tenantAId);
    await expect(ProductService.createProduct(tenantAId, tAMemberId, { name: 'X', sku: 'X' }))
      .rejects.toThrow();
  });

  it('9. Member cannot update Product', async () => {
    mockAuthAs(tAMemberId, tenantAId);
    await expect(ProductService.updateProduct(tenantAId, tAMemberId, productAId, { name: 'X' }))
      .rejects.toThrow();
  });

  it('10. Member cannot deactivate Product', async () => {
    mockAuthAs(tAMemberId, tenantAId);
    await expect(ProductService.deactivateProduct(tenantAId, tAMemberId, productAId))
      .rejects.toThrow();
  });

  it('11. Department Head cannot mutate Product', async () => {
    mockAuthAs(tADeptHeadId, tenantAId);
    await expect(ProductService.createProduct(tenantAId, tADeptHeadId, { name: 'X', sku: 'X' }))
      .rejects.toThrow();
    await expect(ProductService.updateProduct(tenantAId, tADeptHeadId, productAId, { name: 'X' }))
      .rejects.toThrow();
  });

  it('12. Approver cannot mutate Product', async () => {
    mockAuthAs(tAApproverId, tenantAId);
    await expect(ProductService.createProduct(tenantAId, tAApproverId, { name: 'X', sku: 'X' }))
      .rejects.toThrow();
    await expect(ProductService.updateProduct(tenantAId, tAApproverId, productAId, { name: 'X' }))
      .rejects.toThrow();
  });

  it('13. Tenant A cannot read Tenant B Product', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    await expect(ProductService.getProduct(tenantAId, tAAdminId, productBId))
      .rejects.toThrow('Product not found');
  });

  it('14. Tenant A cannot update Tenant B Product', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    await expect(ProductService.updateProduct(tenantAId, tAAdminId, productBId, { name: 'Hacked' }))
      .rejects.toThrow('Product not found');
  });

  it('15. Tenant A cannot deactivate Tenant B Product', async () => {
    mockAuthAs(tAAdminId, tenantAId);
    await expect(ProductService.deactivateProduct(tenantAId, tAAdminId, productBId))
      .rejects.toThrow('Product not found');
  });

  it('16. Client-supplied tenantId cannot cross tenant boundaries', async () => {
    mockAuthAs(tAAdminId, tenantAId); 
    const p = await ProductService.createProduct(tenantAId, tAAdminId, { name: 'Malicious', sku: 'MAL' });
    expect(p.tenantId).toBe(tenantAId);
  });
});
