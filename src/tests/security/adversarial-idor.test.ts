import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../../database/utils/prisma';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { withTenant } from '../../../database/utils/prisma-tenant';
import { TicketService } from '../../modules/support/ticket.service';

describe('Adversarial IDOR / BOLA Testing Matrix (Stage 4)', () => {
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  
  // Tenant B Targets
  const customerBId = crypto.randomUUID();
  const dealBId = crypto.randomUUID();
  const ticketBId = crypto.randomUUID();
  const taskBId = crypto.randomUUID();
  const documentBId = crypto.randomUUID();
  const departmentBId = crypto.randomUUID();
  const territoryBId = crypto.randomUUID();
  const cameraBId = crypto.randomUUID();
  const callLogBId = crypto.randomUUID();
  const quoteBId = crypto.randomUUID();
  const approvalBId = crypto.randomUUID();
  const userBId = crypto.randomUUID(); // Employee

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Create Tenants
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantAId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantBId}', 'Tenant B', now(), now())`);
      
      // Create Users
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userAId}', '${tenantAId}', 'usera@a.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userBId}', '${tenantBId}', 'userb@b.com', 'ACTIVE', now(), now())`);

      // Create Tenant B Objects (Targets)
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerBId}', '${tenantBId}', 'Customer B', 'customer b', now(), now())`);
      
      const pipelineBId = crypto.randomUUID();
      const stageBId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`INSERT INTO "Pipeline" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${pipelineBId}', '${tenantBId}', 'Pipe B', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "PipelineStage" (id, "pipelineId", "tenantId", name, "order", "createdAt", "updatedAt") VALUES ('${stageBId}', '${pipelineBId}', '${tenantBId}', 'Stage 1', 1, now(), now())`);

      await tx.$executeRawUnsafe(`INSERT INTO "Deal" (id, "tenantId", "customerId", "pipelineId", "stageId", "assignedUserId", "createdById", title, value, status, "createdAt", "updatedAt") VALUES ('${dealBId}', '${tenantBId}', '${customerBId}', '${pipelineBId}', '${stageBId}', '${userBId}', '${userBId}', 'Deal B', 1000, 'OPEN', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Ticket" (id, "tenantId", "customerId", subject, description, status, "createdAt", "updatedAt") VALUES ('${ticketBId}', '${tenantBId}', '${customerBId}', 'Ticket B', 'Desc', 'OPEN', now(), now())`);
      
      await tx.$executeRawUnsafe(`INSERT INTO "Task" (id, "tenantId", title, "createdAt", "updatedAt") VALUES ('${taskBId}', '${tenantBId}', 'Task B', now(), now())`);
      
      await tx.$executeRawUnsafe(`INSERT INTO "Document" (id, "tenantId", "fileName", "mimeType", "sizeBytes", "storageKey", "uploadedById", "createdAt", "updatedAt") VALUES ('${documentBId}', '${tenantBId}', 'docB.txt', 'text/plain', 100, 'doc_b', '${userBId}', now(), now())`);
      
      await tx.$executeRawUnsafe(`INSERT INTO "Department" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${departmentBId}', '${tenantBId}', 'Dept B', now(), now())`);
      
      await tx.$executeRawUnsafe(`INSERT INTO "Territory" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${territoryBId}', '${tenantBId}', 'Terr B', now(), now())`);
      
      await tx.$executeRawUnsafe(`INSERT INTO "Camera" (id, "tenantId", name, "ipAddress", protocol, status, "createdAt", "updatedAt") VALUES ('${cameraBId}', '${tenantBId}', 'Cam B', '127.0.0.1', 'RTSP', 'ONLINE', now(), now())`);
      
      await tx.$executeRawUnsafe(`INSERT INTO "CallLog" (id, "tenantId", status, duration, "createdAt", "updatedAt") VALUES ('${callLogBId}', '${tenantBId}', 'COMPLETED', 10, now(), now())`);
      
      await tx.$executeRawUnsafe(`INSERT INTO "ApprovalRequest" (id, "tenantId", "requesterId", resource, "resourceId", status, "createdAt", "updatedAt") VALUES ('${approvalBId}', '${tenantBId}', '${userBId}', 'TICKET', '${ticketBId}', 'PENDING', now(), now())`);
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM "SecurityEvent" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      // AuditLog is protected by an append-only trigger. We cannot delete it, which means we cannot delete Tenant either.
      // await tx.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "ApprovalRequest" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "CallLog" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Camera" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Territory" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Department" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Document" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Task" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Ticket" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Deal" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "PipelineStage" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Pipeline" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      // await tx.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      // await tx.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${tenantAId}', '${tenantBId}')`);
    });
  });

  // Generic helper to assert IDOR block for a given model
  const assertIdorBlock = async (model: string, targetId: string) => {
    const tenantAPrisma = withTenant(tenantAId);
    const db = tenantAPrisma as any;
    
    // READ attempt
    const readResult = await db[model].findUnique({ where: { id: targetId } });
    expect(readResult).toBeNull();

    // UPDATE attempt
    await expect(
      db[model].update({
        where: { id: targetId },
        data: { updatedAt: new Date() } // benign update payload
      })
    ).rejects.toThrow();

    // DELETE attempt
    await expect(
      db[model].delete({
        where: { id: targetId }
      })
    ).rejects.toThrow();
  };

  it('ATTACK: Tenant A attempts IDOR on Tenant B Customer', () => assertIdorBlock('customer', customerBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B Deal', () => assertIdorBlock('deal', dealBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B Ticket', () => assertIdorBlock('ticket', ticketBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B Task', () => assertIdorBlock('task', taskBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B Document', () => assertIdorBlock('document', documentBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B Department', () => assertIdorBlock('department', departmentBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B Territory', () => assertIdorBlock('territory', territoryBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B Camera', () => assertIdorBlock('camera', cameraBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B ApprovalRequest', () => assertIdorBlock('approvalRequest', approvalBId));
  it('ATTACK: Tenant A attempts IDOR on Tenant B User (Employee)', () => assertIdorBlock('user', userBId));
  
  it('ATTACK: Tenant A attempts nested relation injection on Ticket creation', async () => {
    // Tenant A attempts to create a ticket tied to Tenant B's Customer via the application service
    await expect(
      TicketService.createTicket(
        tenantAId,
        userAId, // Actor
        customerBId, // Cross-tenant relation
        'Hacked relation',
        'Desc',
        'MEDIUM'
      )
    ).rejects.toThrow(); // Either 'Forbidden' or 'Customer not found' will block it
  });
});
