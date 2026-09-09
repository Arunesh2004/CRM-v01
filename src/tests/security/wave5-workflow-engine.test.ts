import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { WorkflowService } from '@/modules/ai/workflow/workflow.service';
import actualPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { randomUUID } from 'crypto';
import { ToolRegistry } from '@/modules/ai/tools/registry';

const globalPrisma = new Proxy(actualPrisma, {
  get(target: any, prop: string) {
    if (prop === '$queryRaw') return async (...args: any[]) => executeAsSystem(SystemOperation.SECURITY_AUDIT, (tx) => tx.$queryRaw(...args));
    if (typeof target[prop] === 'object' && target[prop] !== null) {
      return new Proxy(target[prop], {
        get(modelTarget: any, modelProp: string) {
          if (typeof modelTarget[modelProp] === 'function') {
            return async (...args: any[]) => executeAsSystem(SystemOperation.SECURITY_AUDIT, (tx) => tx[prop][modelProp](...args));
          }
          return modelTarget[modelProp];
        }
      });
    }
    return target[prop];
  }
}) as any;

vi.mock('@/lib/queue/inngest.client', () => ({
  inngest: { send: vi.fn(), createFunction: vi.fn() }
}));
vi.mock('@/modules/security-events/security-event.service', () => ({
  SecurityEventService: { logEvent: vi.fn() }
}));

describe('Wave 5 - Workflow Engine Integration', () => {
  let tenantId: string;
  let tenantB: string;
  let adminId: string;
  let lowerPrivUserId: string;
  let unauthorizedUserId: string;
  let inactiveUserId: string;
  let customerId: string;
  let customerBId: string;
  let locationId: string;
  let cameraId: string;
  let aiEventId: string;

  beforeAll(async () => {
    tenantId = randomUUID();
    tenantB = randomUUID();
    adminId = randomUUID();
    lowerPrivUserId = randomUUID();
    unauthorizedUserId = randomUUID();
    inactiveUserId = randomUUID();
    customerId = randomUUID();
    customerBId = randomUUID();
    locationId = randomUUID();
    cameraId = randomUUID();

    await globalPrisma.tenant.create({ data: { id: tenantId, name: 'Wave5 Test Tenant', status: 'ACTIVE' } });
    await globalPrisma.tenant.create({ data: { id: tenantB, name: 'Wave5 Tenant B', status: 'ACTIVE' } });

    await globalPrisma.customer.create({
      data: { id: customerId, tenantId, name: 'Test Customer', normalizedName: 'test customer', industry: 'Tech', status: 'ACTIVE' }
    });
    await globalPrisma.customer.create({
      data: { id: customerBId, tenantId: tenantB, name: 'Test Customer B', normalizedName: 'test customer b', industry: 'Tech', status: 'ACTIVE' }
    });
    
    await globalPrisma.location.create({
      data: { id: locationId, tenantId, customerId, name: 'HQ' }
    });

    await globalPrisma.camera.create({
      data: { id: cameraId, tenantId, locationId, name: 'Cam1', ipAddress: '192.168.1.1', protocol: 'RTSP' }
    });
    aiEventId = randomUUID();
    await globalPrisma.aIEvent.create({
      data: { id: aiEventId, tenantId, cameraId, confidence: 0.99, model: 'yolo-v8', detectedObject: 'person' }
    });

    await globalPrisma.user.createMany({
      data: [
        { id: adminId, clerkId: adminId, email: 'admin@wave5.com', firstName: 'Admin', tenantId, status: 'ACTIVE' },
        { id: lowerPrivUserId, clerkId: lowerPrivUserId, email: 'lower@wave5.com', firstName: 'Lower', tenantId, status: 'ACTIVE' },
        { id: unauthorizedUserId, clerkId: unauthorizedUserId, email: 'user@wave5.com', firstName: 'User', tenantId, status: 'ACTIVE' },
        { id: inactiveUserId, clerkId: inactiveUserId, email: 'inact@wave5.com', firstName: 'Inact', tenantId, status: 'INACTIVE' },
      ]
    });

    // Provision Tools using the idempotent registry bootstrap
    await ToolRegistry.bootstrapTools();

    const permTicket = await globalPrisma.permission.upsert({ where: { resource_action: { resource: 'TICKET', action: 'CREATE' } }, update: {}, create: { resource: 'TICKET', action: 'CREATE' } });
    const permIncident = await globalPrisma.permission.upsert({ where: { resource_action: { resource: 'INCIDENT', action: 'CREATE' } }, update: {}, create: { resource: 'INCIDENT', action: 'CREATE' } });
    const permTask = await globalPrisma.permission.upsert({ where: { resource_action: { resource: 'TASK', action: 'CREATE' } }, update: {}, create: { resource: 'TASK', action: 'CREATE' } });

    const roleAdmin = await globalPrisma.role.create({ data: { tenantId, name: 'AdminRole' } });
    await globalPrisma.rolePermission.createMany({
      data: [
        { tenantId, roleId: roleAdmin.id, permissionId: permTicket.id },
        { tenantId, roleId: roleAdmin.id, permissionId: permIncident.id },
        { tenantId, roleId: roleAdmin.id, permissionId: permTask.id }
      ]
    });
    await globalPrisma.userRole.create({ data: { tenantId, userId: adminId, roleId: roleAdmin.id } });

    const roleLower = await globalPrisma.role.create({ data: { tenantId, name: 'LowerRole' } });
    await globalPrisma.rolePermission.createMany({
      data: [
        { tenantId, roleId: roleLower.id, permissionId: permTicket.id },
        { tenantId, roleId: roleLower.id, permissionId: permTask.id }
        // Lower user cannot create incident (missing CUSTOMER:UPDATE)
      ]
    });
    await globalPrisma.userRole.create({ data: { tenantId, userId: lowerPrivUserId, roleId: roleLower.id } });

  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await globalPrisma.idempotencyKey.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.activityTimeline.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.workflowExecutionStep.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.workflowAction.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.workflowExecution.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.workflow.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.ticketMessage.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.ticket.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.incident.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.task.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.aIEvent.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.camera.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.location.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.customer.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    
    await globalPrisma.userRole.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.rolePermission.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.role.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.user.deleteMany({ where: { OR: [{ tenantId }, { tenantId: tenantB }] } });
    await globalPrisma.permission.deleteMany({ where: { OR: [{ resource: 'TICKET' }, { resource: 'INCIDENT' }, { resource: 'TASK' }] } });
    // Architectural Note: aITool is intentionally globally scoped. We do not delete them in teardown
    // because Vitest runs in parallel and deleting global tools here would break other concurrent tests.
    try { await globalPrisma.tenant.delete({ where: { id: tenantId } }); } catch (e) {}
    try { await globalPrisma.tenant.delete({ where: { id: tenantB } }); } catch (e) {}
  });

  async function runWorkflowAction(userId: string, actionType: string, config: any) {
    const wf = await WorkflowService.createWorkflow(tenantId, userId, {
      name: 'Test Workflow',
      status: 'ACTIVE'
    });
    const exec = await WorkflowService.executeWorkflow(tenantId, userId, wf.id);
    const action = await globalPrisma.workflowAction.create({
      data: { tenantId, workflowId: wf.id, orderIndex: 1, actionType, config }
    });
    return WorkflowService.executeAction(tenantId, wf.id, exec.id, action);
  }

  describe('CONCURRENCY — REQUIRED REAL RACE TEST', () => {
    it('Concurrent duplicate execution produced a single durable CRM mutation under the PostgreSQL transaction + idempotency design', async () => {
      const wf = await WorkflowService.createWorkflow(tenantId, adminId, { name: 'Concurrency WF', status: 'ACTIVE' });
      const exec = await WorkflowService.executeWorkflow(tenantId, adminId, wf.id);
      const action = await globalPrisma.workflowAction.create({
        data: { tenantId, workflowId: wf.id, orderIndex: 1, actionType: 'CREATE_TICKET', config: { customerId, subject: 'Concurrent T', description: 'desc' } }
      });

      // Fire both concurrently
      const results = await Promise.allSettled([
        WorkflowService.executeAction(tenantId, wf.id, exec.id, action),
        WorkflowService.executeAction(tenantId, wf.id, exec.id, action)
      ]);

      const successfulResults = results.filter(r => r.status === 'fulfilled' && (r.value as any).success === true);
      const skippedResults = results.filter(r => r.status === 'fulfilled' && (r.value as any).skipped === true);
      const alreadyProcessed = results.filter(r => r.status === 'fulfilled' && (r.value as any).message === 'Already processed');

      expect(successfulResults.length + skippedResults.length + alreadyProcessed.length).toBeGreaterThanOrEqual(2);

      // Verify DB single durable CRM mutation under the PostgreSQL transaction + idempotency design
      const tickets = await globalPrisma.ticket.findMany({
        where: { tenantId, subject: 'Concurrent T' }
      });
      expect(tickets.length).toBe(1);
    });
  });

  describe('IDEMPOTENCY CONFLICT TEST', () => {
    it('Same idempotency identity + different payload = rejected/determinsitic behavior', async () => {
      // In workflow execution, idempotency key is derived from wf_step_${step.id}
      const wf = await WorkflowService.createWorkflow(tenantId, adminId, { name: 'Idemp WF', status: 'ACTIVE' });
      const exec = await WorkflowService.executeWorkflow(tenantId, adminId, wf.id);
      const action = await globalPrisma.workflowAction.create({
        data: { tenantId, workflowId: wf.id, orderIndex: 1, actionType: 'CREATE_TICKET', config: { customerId, subject: 'Payload A', description: 'desc' } }
      });

      const res1 = await WorkflowService.executeAction(tenantId, wf.id, exec.id, action);
      expect(res1.success).toBe(true);

      // Mutate action config (simulating a payload change on same step)
      await globalPrisma.workflowAction.update({
        where: { id: action.id },
        data: { config: { customerId, subject: 'Payload B', description: 'desc' } }
      });

      const res2 = await WorkflowService.executeAction(tenantId, wf.id, exec.id, action);
      // Because step is marked as COMPLETED, it safely skips
      expect(res2.message).toBe('Already processed');

      const tickets = await globalPrisma.ticket.findMany({ where: { tenantId, subject: 'Payload B' } });
      expect(tickets.length).toBe(0);
    });
  });

  describe('AUTHORIZATION TESTS', () => {
    it('A. Authorized user can create Ticket', async () => {
      const res = await runWorkflowAction(adminId, 'CREATE_TICKET', { customerId, subject: 'Auth T', description: 'desc' });
      expect(res.success).toBe(true);
    });
    
    it('B. Authorized user can create Incident', async () => {
      const eId = randomUUID();
      await globalPrisma.aIEvent.create({
        data: { id: eId, tenantId, cameraId, confidence: 0.99, model: 'yolo', detectedObject: 'x' }
      });
      const res = await runWorkflowAction(adminId, 'CREATE_INCIDENT', { locationId, cameraId, aiEventId: eId, title: 'Auth I', description: 'desc', severity: 'LOW' });
      expect(res.success).toBe(true);
    });
    
    it('C. User without required permission is rejected', async () => {
      await expect(runWorkflowAction(lowerPrivUserId, 'CREATE_INCIDENT', { locationId, cameraId, title: 'Auth I' }))
        .rejects.toThrow(/403: Forbidden - AI lacks inherited permission to execute this tool./);
    });

    it('D. Inactive creator is rejected', async () => {
      await expect(runWorkflowAction(inactiveUserId, 'CREATE_TICKET', { customerId, subject: 'Fail' }))
        .rejects.toThrow(/403: Forbidden - Workflow creator identity is no longer valid/);
    });

    it('E. Permission revoked after workflow creation is rejected at execution time', async () => {
      const wf = await WorkflowService.createWorkflow(tenantId, lowerPrivUserId, { name: 'Revoke', status: 'ACTIVE' });
      const exec = await WorkflowService.executeWorkflow(tenantId, lowerPrivUserId, wf.id);
      const action = await globalPrisma.workflowAction.create({
        data: { tenantId, workflowId: wf.id, orderIndex: 1, actionType: 'CREATE_TICKET', config: { customerId, subject: 'Test', description: 'desc' } }
      });

      // Revoke permission from LowerRole
      const role = await globalPrisma.role.findFirst({ where: { name: 'LowerRole' } });
      const perm = await globalPrisma.permission.findFirst({ where: { resource: 'TICKET', action: 'CREATE' }});
      if (role && perm) {
        await globalPrisma.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: perm.id } });
      }
      
      // Execution fails due to dynamic context checking
      await expect(WorkflowService.executeAction(tenantId, wf.id, exec.id, action))
        .rejects.toThrow(/403: Forbidden - AI lacks inherited permission to execute this tool./);

      // Restore permission for other tests
      if (role && perm) {
        await globalPrisma.rolePermission.create({ data: { tenantId, roleId: role.id, permissionId: perm.id } });
      }
    });
  });

  describe('AUTHORITY CEILING TEST', () => {
    it('Cannot elevate execution authority via payload', async () => {
      // Lower privilege user is attempting to inject adminId or tenant overrides
      await expect(runWorkflowAction(lowerPrivUserId, 'CREATE_TICKET', { 
        customerId, subject: 'Elevate', description: 'desc',
        userId: adminId, actorId: adminId, tenantId: tenantB, createdById: adminId
      })).rejects.toThrow(/400: Forbidden identity field/);
    });
  });

  describe('TENANT ISOLATION TEST', () => {
    it('Mutation rejected for cross-tenant references', async () => {
      // tenant B customer
      await expect(runWorkflowAction(adminId, 'CREATE_TICKET', { 
        customerId: customerBId, subject: 'Cross Tenant', description: 'desc' 
      })).rejects.toThrow();
      
      const bTickets = await globalPrisma.ticket.findMany({ where: { tenantId: tenantB } });
      expect(bTickets.length).toBe(0);
    });
  });

  describe('INCIDENT BUSINESS-ERROR TEST', () => {
    it('Duplicate aiEventId with different idempotency key enforces Prisma uniqueness error', async () => {
      const eId = randomUUID();
      await globalPrisma.aIEvent.create({
        data: { id: eId, tenantId, cameraId, confidence: 0.99, model: 'yolo', detectedObject: 'x' }
      });
      // First workflow creates incident for this aiEventId
      const res1 = await runWorkflowAction(adminId, 'CREATE_INCIDENT', { locationId, cameraId, aiEventId: eId, title: 'I1', severity: 'LOW' });
      expect(res1.success).toBe(true);

      // Second DIFFERENT workflow execution attempts to create incident for same aiEventId
      await expect(runWorkflowAction(adminId, 'CREATE_INCIDENT', { locationId, cameraId, aiEventId: eId, title: 'I2', severity: 'HIGH' }))
        .rejects.toThrow(); // Prisma P2002 on aiEventId unique constraint
    });
  });

  describe('TRANSACTION ROLLBACK TEST', () => {
    it('Failed business mutation rolls back the idempotency key', async () => {
      const wf = await WorkflowService.createWorkflow(tenantId, adminId, { name: 'Rollback WF', status: 'ACTIVE' });
      const exec = await WorkflowService.executeWorkflow(tenantId, adminId, wf.id);
      const action = await globalPrisma.workflowAction.create({
        data: { tenantId, workflowId: wf.id, orderIndex: 1, actionType: 'CREATE_INCIDENT', config: { locationId, cameraId, aiEventId: 'invalid-ai-event-id', title: 'Fail' } }
      });

      // Will fail relation check
      await expect(WorkflowService.executeAction(tenantId, wf.id, exec.id, action)).rejects.toThrow();

      // Ensure no idempotency key was written
      const step = await globalPrisma.workflowExecutionStep.findFirst({ where: { actionId: action.id }});
      if (step) {
        const idempKeyStr = `wf_step_${step.id}`;
        const key = await globalPrisma.idempotencyKey.findFirst({ where: { tenantId, key: idempKeyStr } });
        expect(key).toBeNull();
      }
    });
  });

  describe('EXISTING CREATE_TASK REGRESSION', () => {
    it('CREATE_TASK still works completely', async () => {
      const res = await runWorkflowAction(adminId, 'CREATE_TASK', {
        title: 'Task 1', description: 'Desc', customerId
      });
      expect(res.success).toBe(true);
      expect(res.result.title).toBe('Task 1');
    });
  });
});
