import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateCameraSchema, UpdateCameraSchema } from '@/modules/cctv/validators/camera.schema';

describe('CCTV Credential Semantics', () => {
  describe('Zod Validation', () => {
    it('allows NONE authMode without credentials', () => {
      const result = CreateCameraSchema.safeParse({
        name: 'Test',
        locationId: 'loc-1',
        ipAddress: '192.168.1.1',
        protocol: 'RTSP',
        authMode: 'NONE'
      });
      expect(result.success).toBe(true);
    });

    it('allows PASSWORD authMode without credentials (to be configured later)', () => {
      const result = CreateCameraSchema.safeParse({
        name: 'Test',
        locationId: 'loc-1',
        ipAddress: '192.168.1.1',
        protocol: 'RTSP',
        authMode: 'PASSWORD'
      });
      expect(result.success).toBe(true);
    });

    it('allows PASSWORD authMode with both username and password', () => {
      const result = CreateCameraSchema.safeParse({
        name: 'Test',
        locationId: 'loc-1',
        ipAddress: '192.168.1.1',
        protocol: 'RTSP',
        authMode: 'PASSWORD',
        rtspUsername: 'admin',
        rtspPassword: 'password123'
      });
      expect(result.success).toBe(true);
    });

    it('rejects username without password', () => {
      const result = CreateCameraSchema.safeParse({
        name: 'Test',
        locationId: 'loc-1',
        ipAddress: '192.168.1.1',
        protocol: 'RTSP',
        authMode: 'PASSWORD',
        rtspUsername: 'admin'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('Password is required'))).toBe(true);
      }
    });

    it('rejects password without username', () => {
      const result = CreateCameraSchema.safeParse({
        name: 'Test',
        locationId: 'loc-1',
        ipAddress: '192.168.1.1',
        protocol: 'RTSP',
        authMode: 'PASSWORD',
        rtspPassword: 'password123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('Username is required'))).toBe(true);
      }
    });

    it('does not allow updating credentials via normal update schema', () => {
      const result = UpdateCameraSchema.safeParse({
        id: 'cam-1',
        rtspUsername: 'admin'
      });
      // The schema should just strip it or fail if strict. Here it strips but let's check it parses successfully without the credential fields inside the output.
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).rtspUsername).toBeUndefined();
      }
    });
  });
});
