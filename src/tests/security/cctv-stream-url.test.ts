import { describe, it, expect, beforeAll } from 'vitest';
import { Prisma } from '@prisma/client';
import prisma from '../../../database/utils/prisma';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { withTenantTransaction } from '../../../database/utils/prisma-tenant';

describe('S10 R01: CameraStream.streamUrl ORM Security Guard', () => {
  let tenantId: string;
  let cameraId: string;

  beforeAll(async () => {
    tenantId = crypto.randomUUID();
    cameraId = crypto.randomUUID();
    const custId = crypto.randomUUID();
    const locId = crypto.randomUUID();

    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.tenant.createMany({ data: [{ id: tenantId, name: 'Test Tenant R01' }], skipDuplicates: true });
      await tx.customer.createMany({ data: [{ id: custId, tenantId, name: 'Test Cust', normalizedName: 'testcustr01' }], skipDuplicates: true });
      await tx.location.createMany({ data: [{ id: locId, customerId: custId, tenantId, name: 'Test Loc' }], skipDuplicates: true });
      await tx.camera.createMany({ data: [{ id: cameraId, tenantId, locationId: locId, name: 'R01 Cam', ipAddress: '192.168.1.1', protocol: 'RTSP', authMode: 'NONE' }], skipDuplicates: true });
    });
  });

  const executeAsTenant = async <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
    return await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      return await fn(tx);
    });
  };

  it('1. Safe RTSP URL succeeds', async () => {
    const stream = await executeAsTenant(tx => tx.cameraStream.create({
      data: {
        tenantId,
        cameraId,
        streamUrl: 'rtsp://camera.example.com/live',
        protocol: 'RTSP'
      }
    }));
    expect(stream.streamUrl).toBe('rtsp://camera.example.com/live');
    await executeAsTenant(tx => tx.cameraStream.delete({ where: { id: stream.id } }));
  });

  it('2. Safe RTSPS URL succeeds', async () => {
    const stream = await executeAsTenant(tx => tx.cameraStream.create({
      data: {
        tenantId,
        cameraId,
        streamUrl: 'rtsps://camera.example.com/live',
        protocol: 'RTSPS'
      }
    }));
    expect(stream.streamUrl).toBe('rtsps://camera.example.com/live');
    await executeAsTenant(tx => tx.cameraStream.delete({ where: { id: stream.id } }));
  });

  it('3. Credential-bearing RTSP URL is rejected in create', async () => {
    await expect(executeAsTenant(tx => tx.cameraStream.create({
      data: {
        tenantId,
        cameraId,
        streamUrl: 'rtsp://user:password@camera.example.com/live',
        protocol: 'RTSP'
      }
    }))).rejects.toThrow('SECURITY VIOLATION: CameraStream.streamUrl cannot contain embedded credentials');
  });

  it('4. Credential-bearing RTSPS URL is rejected in create', async () => {
    await expect(executeAsTenant(tx => tx.cameraStream.create({
      data: {
        tenantId,
        cameraId,
        streamUrl: 'rtsps://user:password@camera.example.com/live',
        protocol: 'RTSPS'
      }
    }))).rejects.toThrow('SECURITY VIOLATION: CameraStream.streamUrl cannot contain embedded credentials');
  });

  it('5. Malformed URL is rejected', async () => {
    await expect(executeAsTenant(tx => tx.cameraStream.create({
      data: {
        tenantId,
        cameraId,
        streamUrl: 'not_a_valid_url',
        protocol: 'RTSP'
      }
    }))).rejects.toThrow('SECURITY VIOLATION: Malformed streamUrl is rejected');
  });

  it('6. Update containing credential-bearing streamUrl is rejected', async () => {
    const stream = await executeAsTenant(tx => tx.cameraStream.create({
      data: {
        tenantId,
        cameraId,
        streamUrl: 'rtsp://camera.example.com/live',
        protocol: 'RTSP'
      }
    }));

    await expect(executeAsTenant(tx => tx.cameraStream.update({
      where: { id: stream.id },
      data: { streamUrl: 'rtsp://user:pass@camera.example.com' }
    }))).rejects.toThrow('SECURITY VIOLATION: CameraStream.streamUrl cannot contain embedded credentials');

    await executeAsTenant(tx => tx.cameraStream.delete({ where: { id: stream.id } }));
  });

  it('7. Upsert containing credential-bearing streamUrl is rejected', async () => {
    await expect(executeAsTenant(tx => tx.cameraStream.upsert({
      where: { id: 'nonexistent-id' },
      create: {
        tenantId,
        cameraId,
        streamUrl: 'rtsp://user:pass@camera.example.com',
        protocol: 'RTSP'
      },
      update: {
        streamUrl: 'rtsp://user:pass@camera.example.com',
      }
    }))).rejects.toThrow('SECURITY VIOLATION: CameraStream.streamUrl cannot contain embedded credentials');
  });

  it('8. createMany is protected', async () => {
    await expect(executeAsTenant(tx => tx.cameraStream.createMany({
      data: [
        { tenantId, cameraId, streamUrl: 'rtsp://safe.com', protocol: 'RTSP' },
        { tenantId, cameraId, streamUrl: 'rtsp://user:pass@unsafe.com', protocol: 'RTSP' }
      ]
    }))).rejects.toThrow('SECURITY VIOLATION: CameraStream.streamUrl cannot contain embedded credentials');
  });

  it('9. updateMany is protected', async () => {
    await expect(executeAsTenant(tx => tx.cameraStream.updateMany({
      where: { cameraId },
      data: { streamUrl: 'rtsp://user:pass@unsafe.com' }
    }))).rejects.toThrow('SECURITY VIOLATION: CameraStream.streamUrl cannot contain embedded credentials');
  });
});
