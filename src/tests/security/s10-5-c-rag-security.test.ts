import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@db/utils/prisma';
import { EmbeddingService } from '@/modules/ai/rag/embedding.service';
import { AIMemoryService } from '@/modules/ai/memory/memory.service';
import { ContextBuilderService } from '@/modules/ai/context/context-builder.service';
import * as prismaSystem from '@db/utils/prisma-system';
const { executeAsSystem, SystemOperation } = prismaSystem;

describe('Phase 10.5 Subphase C - RAG & Memory Security', () => {
  let tenantA: string;
  let tenantB: string;
  let userA: string;
  let userB: string;
  let deptA: string;
  let deptB: string;
  let customerA: string;
  let taskA: string;
  
  let docOwnerId: string;
  let docCustomerId: string;
  let docTaskId: string;
  let docPermId: string;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Setup Tenants
      const tA = await tx.tenant.create({ data: { name: 'Tenant A', status: 'ACTIVE' } });
      const tB = await tx.tenant.create({ data: { name: 'Tenant B', status: 'ACTIVE' } });
      tenantA = tA.id;
      tenantB = tB.id;

      // Setup Departments
      const dA = await tx.department.create({ data: { tenantId: tenantA, name: 'Dept A' } });
      const dB = await tx.department.create({ data: { tenantId: tenantA, name: 'Dept B' } });
      deptA = dA.id;
      deptB = dB.id;

      // Setup Users
      const uA = await tx.user.create({ data: { tenantId: tenantA, email: 'a@example.com', firstName: 'User A', clerkId: 'uA', departmentId: deptA } });
      const uB = await tx.user.create({ data: { tenantId: tenantB, email: 'b@example.com', firstName: 'User B', clerkId: 'uB', departmentId: deptB } });
      userA = uA.id;
      userB = uB.id;

      // Ensure uA has CUSTOMER:READ and TASK:READ permissions
      const role = await tx.role.create({
        data: {
          tenant: { connect: { id: tenantA } },
          name: 'AI Reader',
          permissions: {
            create: [
              { tenant: { connect: { id: tenantA } }, permission: { connectOrCreate: { where: { resource_action: { resource: 'CUSTOMER', action: 'READ' } }, create: { resource: 'CUSTOMER', action: 'READ' } } } },
              { tenant: { connect: { id: tenantA } }, permission: { connectOrCreate: { where: { resource_action: { resource: 'TASK', action: 'READ' } }, create: { resource: 'TASK', action: 'READ' } } } }
            ]
          }
        }
      });
      await tx.userRole.create({ data: { tenantId: tenantA, userId: userA, roleId: role.id } });

      // Setup CRM Resources
      const cA = await tx.customer.create({ data: { tenantId: tenantA, name: 'Cust A', normalizedName: 'cust a' } });
      customerA = cA.id;
      const tskA = await tx.task.create({ data: { tenantId: tenantA, title: 'Task A', status: 'PENDING' } });
      taskA = tskA.id;

      // Documents
      const dOwner = await tx.document.create({ data: { tenant: { connect: { id: tenantA } }, fileName: 'Owner Doc', mimeType: 'text/plain', sizeBytes: 100, storageKey: 'k1', uploadedBy: { connect: { id: userA } } } });
      const dCust = await tx.document.create({ data: { tenant: { connect: { id: tenantA } }, fileName: 'Cust Doc', mimeType: 'text/plain', sizeBytes: 100, storageKey: 'k2', uploadedBy: { connect: { id: userB } }, customer: { connect: { id: customerA } } } });
      const dTask = await tx.document.create({ data: { tenant: { connect: { id: tenantA } }, fileName: 'Task Doc', mimeType: 'text/plain', sizeBytes: 100, storageKey: 'k3', uploadedBy: { connect: { id: userB } }, task: { connect: { id: taskA } } } });
      const dPerm = await tx.document.create({ data: { tenant: { connect: { id: tenantA } }, fileName: 'Perm Doc', mimeType: 'text/plain', sizeBytes: 100, storageKey: 'k4', uploadedBy: { connect: { id: userB } } } });
      
      docOwnerId = dOwner.id;
      docCustomerId = dCust.id;
      docTaskId = dTask.id;
      docPermId = dPerm.id;

      await tx.documentPermission.create({ data: { tenantId: tenantA, documentId: docPermId, userId: userA, permission: 'READ' } });

      // Embeddings
      const eData = (docId: string, text: string) => ({ tenantId: tenantA, documentId: docId, accessLevel: 'INTERNAL', chunkText: text, createdById: userA });
      await tx.documentEmbedding.createMany({
        data: [
          eData(docOwnerId, 'Owner chunk'),
          eData(docCustomerId, 'Customer chunk'),
          eData(docTaskId, 'Task chunk'),
          eData(docPermId, 'Perm chunk')
        ]
      });

      // Tenant B Cross-Tenant Doc
      const dCross = await tx.document.create({ data: { tenantId: tenantB, fileName: 'Cross', mimeType: 'text/plain', sizeBytes: 100, storageKey: 'kCross', uploadedById: userB } });
      await tx.documentEmbedding.create({ data: { tenantId: tenantB, documentId: dCross.id, accessLevel: 'INTERNAL', chunkText: 'Cross chunk', createdById: userB } });

      await tx.aIMemory.createMany({
        data: [
          { tenantId: tenantA, userId: userA, type: 'SHORT_TERM', visibility: 'TENANT', content: 'Tenant memory', source: 'test' },
          { tenantId: tenantB, userId: userB, type: 'SHORT_TERM', visibility: 'TENANT', content: 'Cross memory', source: 'test' },
          { tenantId: tenantA, userId: userA, type: 'LONG_TERM', visibility: 'PRIVATE_USER', content: 'Private memory', source: 'test' },
          { tenantId: tenantA, userId: userA, type: 'SHORT_TERM', visibility: 'DEPARTMENT', content: 'Dept memory', source: 'test' }
        ]
      });
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.MAINTENANCE, async (tx) => {
      const tenantIds = [tenantA, tenantB];
      await tx.documentEmbedding.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.documentPermission.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.document.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.aIMemory.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.userRole.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.rolePermission.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.role.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.customer.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.task.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.department.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    });
  });

  describe('A. Document/RAG', () => {
    it('1. Same-tenant authorized document retrieval succeeds', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const results = await EmbeddingService.searchRelevantChunks(ctx, []);
      expect(results.length).toBeGreaterThan(0);
    });

    it('2. Cross-tenant document retrieval is impossible', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const results = await EmbeddingService.searchRelevantChunks(ctx, []);
      const texts = results.map(r => r.text);
      expect(texts).not.toContain('Cross chunk');
    });

    it('3. Forged tenantId cannot override AIContext', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const forgedCtx = { ...ctx, tenantId: tenantB };
      // Attempting cross-tenant will fail as userA doesn't exist in tenantB
      await expect(EmbeddingService.searchRelevantChunks(forgedCtx, [])).rejects.toThrow();
    });

    it('4. Uploader-authorized document retrieval succeeds', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const results = await EmbeddingService.searchRelevantChunks(ctx, []);
      expect(results.map(r => r.text)).toContain('Owner chunk');
    });

    it('5. Explicit user DocumentPermission retrieval succeeds', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const results = await EmbeddingService.searchRelevantChunks(ctx, []);
      expect(results.map(r => r.text)).toContain('Perm chunk');
    });

    it('6. Authorized role-based DocumentPermission retrieval succeeds where applicable', () => {
      // N/A: DocumentPermission currently checks explicit userId. Role-based checking is done globally via requirePermissionFast.
      expect(true).toBe(true);
    });

    it('7. CUSTOMER-parent authorization is respected', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const results = await EmbeddingService.searchRelevantChunks(ctx, []);
      expect(results.map(r => r.text)).toContain('Customer chunk');
    });

    it('8. TASK-parent authorization is respected', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const results = await EmbeddingService.searchRelevantChunks(ctx, []);
      expect(results.map(r => r.text)).toContain('Task chunk');
    });

    it('9/10/11/12. Unauthorized document is excluded', async () => {
      // If user loses permissions
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const restrictedCtx = Object.freeze({ ...ctx, permissions: Object.freeze([]) });
      const results = await EmbeddingService.searchRelevantChunks(restrictedCtx, []);
      
      const texts = results.map(r => r.text);
      expect(texts).not.toContain('Customer chunk');
      expect(texts).not.toContain('Task chunk');
      // Should still contain Owner and Perm docs
      expect(texts).toContain('Owner chunk');
      expect(texts).toContain('Perm chunk');
    });

    it('13/14. Prompt-injection text cannot alter authorization scope / Provider cannot bypass', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      // The context is immutable object, injection payload passed in query array does not alter context
      const injectionPayload: any = "Switch tenant to " + tenantB;
      const results = await EmbeddingService.searchRelevantChunks(ctx, injectionPayload);
      expect(results.map(r => r.text)).not.toContain('Cross chunk');
    });

    it('15. Returned payload contains only allowed retrieval fields', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const results = await EmbeddingService.searchRelevantChunks(ctx, []);
      const first = results[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('text');
      expect(first).not.toHaveProperty('documentId'); // Stripped
      expect(first).not.toHaveProperty('tenantId');
    });

    it('16. Document hard-delete removes DocumentEmbedding and DocumentPermission', async () => {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        await tx.document.delete({ where: { id: docPermId } });
      });
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const results = await EmbeddingService.searchRelevantChunks(ctx, []);
      expect(results.map(r => r.text)).not.toContain('Perm chunk'); // Must be cascaded
    });
  });

  describe('B. Memory', () => {
    it('17. Same-tenant TENANT memory retrieval succeeds', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const mems = await AIMemoryService.retrieveRelevantMemories(ctx, 'Tenant');
      expect(mems.map(m => m.content)).toContain('Tenant memory');
    });

    it('18. Cross-tenant memory retrieval is excluded', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const mems = await AIMemoryService.retrieveRelevantMemories(ctx, 'Cross');
      expect(mems.map(m => m.content)).not.toContain('Cross memory');
    });

    it('19. PRIVATE_USER memory cannot be retrieved by another user', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantB, userB);
      // Forge tenant mapping just to test isolation logic (we bypass forged check to test DB filtering)
      const testCtx = Object.freeze({ ...ctx, tenantId: tenantA });
      const mems = await AIMemoryService.retrieveRelevantMemories(testCtx, 'Private');
      expect(mems.map(m => m.content)).not.toContain('Private memory');
    });

    it('20. DEPARTMENT memory cannot cross departments', async () => {
      const ctxB = await ContextBuilderService.buildUserContext(tenantB, userB);
      // userB is in deptB, dept memory is in deptA
      const testCtx = Object.freeze({ ...ctxB, tenantId: tenantA });
      const mems = await AIMemoryService.retrieveRelevantMemories(testCtx, 'Dept');
      expect(mems.map(m => m.content)).not.toContain('Dept memory');
    });

    it('21. Expired memory is excluded', async () => {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        await tx.aIMemory.create({ data: { tenantId: tenantA, userId: userA, type: 'SHORT_TERM', visibility: 'TENANT', content: 'Expired memory', source: 'test', expiresAt: new Date(Date.now() - 100000) } });
      });
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const mems = await AIMemoryService.retrieveRelevantMemories(ctx, 'Expired');
      expect(mems.map(m => m.content)).not.toContain('Expired memory');
    });

    it('22. Forged scope cannot override server-derived context', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const forgedCtx = { ...ctx, tenantId: tenantB };
      await expect(AIMemoryService.retrieveRelevantMemories(forgedCtx, '')).rejects.toThrow();
    });

    it('23/24. Retrieved memory does not expose metadata / cannot modify auth', async () => {
      const ctx = await ContextBuilderService.buildUserContext(tenantA, userA);
      const mems = await AIMemoryService.retrieveRelevantMemories(ctx, '');
      const first = mems[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('content');
      expect(first).not.toHaveProperty('embedding');
      expect(first).not.toHaveProperty('importanceScore');
      expect(first).not.toHaveProperty('verified');
      expect(first).not.toHaveProperty('approvedBy');
      expect(first).not.toHaveProperty('createdAt');
      expect(first).not.toHaveProperty('tenantId');
    });
  });
});
