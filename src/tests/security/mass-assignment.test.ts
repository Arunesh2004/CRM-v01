import { describe, it, expect } from 'vitest';
import { CreateCustomerSchema, UpdateCustomerSchema } from '../../modules/crm/validators/customer.schema';
import { CreateIncidentSchema } from '../../modules/incident/validators/incident.schema';
import { CreateLocationSchema } from '../../modules/crm/validators/location.schema';
import { CreateLeadSchema } from '../../modules/crm/validators/lead.schema';
import { CreateTaskSchema } from '../../modules/crm/validators/task.schema';
import { CreateMessageSchema } from '../../modules/communication/validators/message.schema';

describe('Adversarial Mass Assignment / Validation Testing (Stage 6)', () => {
  it('ATTACK: Inject tenantId and ownerId into CreateCustomerSchema', () => {
    const maliciousPayload = {
      name: 'Legit Company',
      tenantId: 'MALICIOUS_TENANT_ID',
      ownerId: 'MALICIOUS_OWNER_ID',
      role: 'ADMIN',
      permissions: 'ALL'
    };

    const result = CreateCustomerSchema.safeParse(maliciousPayload);
    // Expect strict rejection
    expect(result.success).toBe(false);
  });

  it('ATTACK: Inject internal fields into UpdateCustomerSchema', () => {
    const maliciousPayload = {
      id: 'valid-uuid',
      name: 'Legit Company Updated',
      status: 'ACTIVE',
      tenantId: 'MALICIOUS_TENANT_ID',
    };
    const result = UpdateCustomerSchema.safeParse(maliciousPayload);
    expect(result.success).toBe(false);
  });

  it('ATTACK: Inject tenantId into CreateIncidentSchema (Strips unknown fields)', () => {
    const maliciousPayload = {
      locationId: 'loc1',
      cameraId: 'cam1',
      aiEventId: 'event1',
      title: 'Incident',
      severity: 'HIGH',
      tenantId: 'MALICIOUS_TENANT_ID',
      isAdmin: true
    };
    
    const result = CreateIncidentSchema.safeParse(maliciousPayload);
    expect(result.success).toBe(true); // Default Zod behavior is strip
    if (result.success) {
      // The parsed data MUST NOT contain the malicious fields
      expect((result.data as any).tenantId).toBeUndefined();
      expect((result.data as any).isAdmin).toBeUndefined();
    }
  });

  it('ATTACK: Inject role into CreateLocationSchema (Strips unknown fields)', () => {
    const maliciousPayload = {
      name: 'Loc',
      customerId: 'cust1',
      role: 'ADMIN',
      permissions: 'ALL'
    };
    const result = CreateLocationSchema.safeParse(maliciousPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).role).toBeUndefined();
    }
  });

  it('ATTACK: Inject bypass approval into CreateTaskSchema', () => {
    const maliciousPayload = {
      title: 'Task',
      priority: 'HIGH',
      assignedUserId: 'user1',
      tenantId: 'MALICIOUS_TENANT_ID'
    };
    const result = CreateTaskSchema.safeParse(maliciousPayload);
    expect(result.success).toBe(false); // Strict schema
  });

  it('ATTACK: Inject raw SQL string into CreateLeadSchema', () => {
    const maliciousPayload = {
      firstName: 'Lead',
      lastName: 'A',
      company: 'Co',
      email: 'a@a.com',
      tenantId: 'MALICIOUS',
      rawSql: 'DROP TABLE Users;'
    };
    const result = CreateLeadSchema.safeParse(maliciousPayload);
    expect(result.success).toBe(false); // Strict schema
  });

  it('ATTACK: Inject internal fields into CreateMessageSchema', () => {
    const maliciousPayload = {
      content: 'Hello',
      senderId: 'hacked_sender',
      ticketId: 't1',
      tenantId: 'MALICIOUS_TENANT_ID'
    };
    const result = CreateMessageSchema.safeParse(maliciousPayload);
    expect(result.success).toBe(false); // Strict schema
  });
});
