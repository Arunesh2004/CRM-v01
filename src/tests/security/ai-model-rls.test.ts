import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

describe('AI Models RLS (Phase 1R)', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let convA: any;
  let convB: any;
  let toolA: any;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      tenantA = await tx.tenant.create({ data: { name: 'Tenant A', status: 'ACTIVE' } });
      tenantB = await tx.tenant.create({ data: { name: 'Tenant B', status: 'ACTIVE' } });

      userA = await tx.user.create({ data: { tenantId: tenantA.id, email: 'a@example.com', clerkId: 'c_a_' + Date.now(), status: 'ACTIVE' } });
      userB = await tx.user.create({ data: { tenantId: tenantB.id, email: 'b@example.com', clerkId: 'c_b_' + Date.now(), status: 'ACTIVE' } });

      convA = await tx.aIConversation.create({ data: { tenantId: tenantA.id, userId: userA.id, title: 'Conv A' } });
      convB = await tx.aIConversation.create({ data: { tenantId: tenantB.id, userId: userB.id, title: 'Conv B' } });

      await tx.aIConversationMessage.create({ data: { tenantId: tenantA.id, conversationId: convA.id, role: 'USER', content: 'Msg A' } });
      await tx.aIConversationMessage.create({ data: { tenantId: tenantB.id, conversationId: convB.id, role: 'USER', content: 'Msg B' } });

      toolA = await tx.aITool.create({ data: { name: 'Tool_' + Date.now() } });
      
      await tx.aIExecution.create({ data: { tenantId: tenantA.id, userId: userA.id, toolId: toolA.id, input: {} } });
      await tx.aIExecution.create({ data: { tenantId: tenantB.id, userId: userB.id, toolId: toolA.id, input: {} } });
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.aIExecution.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
      await tx.aITool.deleteMany({ where: { id: toolA.id } });
      await tx.aIConversationMessage.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
      await tx.aIConversation.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
      await tx.user.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    });
  });

  it('Tenant A SELECT AIConversation A -> ALLOW, B -> DENY', async () => {
    const res = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA.id}, true)`;
      return tx.$queryRaw<any[]>`SELECT * FROM "AIConversation"`;
    });
    expect(res.length).toBe(1);
    expect(res[0].tenantId).toBe(tenantA.id);
  });

  it('Tenant A INSERT AIConversation tenantId=A -> ALLOW, tenantId=B -> DENY', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA.id}, true)`;
      await tx.$executeRaw`INSERT INTO "AIConversation" (id, "tenantId", "userId", title, "updatedAt") VALUES (${'conv_new_' + Date.now()}, ${tenantA.id}, ${userA.id}, 'New', NOW())`;
    });

    await expect(prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA.id}, true)`;
      await tx.$executeRaw`INSERT INTO "AIConversation" (id, "tenantId", "userId", title, "updatedAt") VALUES (${'conv_evil_' + Date.now()}, ${tenantB.id}, ${userA.id}, 'Evil', NOW())`;
    })).rejects.toThrow();
  });

  it('Tenant A UPDATE AIConversation A -> ALLOW, B -> DENY', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA.id}, true)`;
      const updated = await tx.$executeRaw`UPDATE "AIConversation" SET title = 'Updated A' WHERE id = ${convA.id}`;
      expect(updated).toBeGreaterThan(0);
      
      const updatedB = await tx.$executeRaw`UPDATE "AIConversation" SET title = 'Hacked B' WHERE id = ${convB.id}`;
      expect(updatedB).toBe(0);
    });
  });

  it('Tenant A UPDATE AIConversation A SET tenantId=B -> DENY', async () => {
    await expect(prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA.id}, true)`;
      await tx.$executeRaw`UPDATE "AIConversation" SET "tenantId" = ${tenantB.id} WHERE id = ${convA.id}`;
    })).rejects.toThrow();
  });

  it('Tenant A DELETE AIConversation A -> ALLOW, B -> DENY', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA.id}, true)`;
      const deletedB = await tx.$executeRaw`DELETE FROM "AIConversation" WHERE id = ${convB.id}`;
      expect(deletedB).toBe(0); // Invisible, cannot delete
    });
  });

  it('Tenant A INSERT AIConversationMessage referencing Tenant B conv -> DENY (Foreign-Key Escape)', async () => {
    await expect(prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA.id}, true)`;
      await tx.$executeRaw`INSERT INTO "AIConversationMessage" (id, "tenantId", "conversationId", role, content, "createdAt") VALUES (${'msg_evil_' + Date.now()}, ${tenantA.id}, ${convB.id}, 'USER', 'Evil', NOW())`;
    })).rejects.toThrow();
  });

  it('Tenant A INSERT AIExecution referencing Tenant B user -> DENY (Foreign-Key Escape)', async () => {
    await expect(prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantA.id}, true)`;
      await tx.$executeRaw`INSERT INTO "AIExecution" (id, "tenantId", "userId", "toolId", input, "updatedAt") VALUES (${'exec_evil_' + Date.now()}, ${tenantA.id}, ${userB.id}, ${toolA.id}, '{}', NOW())`;
    })).rejects.toThrow();
  });
});
