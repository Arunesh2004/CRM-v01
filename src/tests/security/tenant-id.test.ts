import { describe, it, expect } from 'vitest';
import { assertValidTenantId } from '../../../database/utils/tenant-id';

describe('assertValidTenantId', () => {
  it('should accept valid UUIDv4 strings', () => {
    expect(() => assertValidTenantId('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
    expect(() => assertValidTenantId('6314f0ec-c3a2-4288-b89f-ed981fd7f712')).not.toThrow();
  });

  it('should accept uppercase UUID strings', () => {
    expect(() => assertValidTenantId('6314F0EC-C3A2-4288-B89F-ED981FD7F712')).not.toThrow();
  });

  it('should reject empty strings', () => {
    expect(() => assertValidTenantId('')).toThrow('SECURITY_ERROR');
  });

  it('should reject malformed UUIDs', () => {
    expect(() => assertValidTenantId('123e4567-e89b-12d3-a456-42661417400')).toThrow('SECURITY_ERROR');
    expect(() => assertValidTenantId('123e4567-e89b-12d3-a456-4266141740000')).toThrow('SECURITY_ERROR');
    expect(() => assertValidTenantId('123e4567_e89b_12d3_a456_426614174000')).toThrow('SECURITY_ERROR');
  });

  it('should reject SQL injection payloads', () => {
    expect(() => assertValidTenantId("'; DROP TABLE users; --")).toThrow('SECURITY_ERROR');
    expect(() => assertValidTenantId("123e4567-e89b-12d3-a456-426614174000'; SELECT * FROM users--")).toThrow('SECURITY_ERROR');
  });

  it('should reject strings with semicolons', () => {
    expect(() => assertValidTenantId('123e4567-e89b-12d3-a456-426614174000;')).toThrow('SECURITY_ERROR');
  });

  it('should reject strings with whitespace', () => {
    expect(() => assertValidTenantId(' 123e4567-e89b-12d3-a456-426614174000')).toThrow('SECURITY_ERROR');
    expect(() => assertValidTenantId('123e4567-e89b-12d3-a456-426614174000 ')).toThrow('SECURITY_ERROR');
    expect(() => assertValidTenantId('123e4567-e89b-12d3-a456-426614 174000')).toThrow('SECURITY_ERROR');
  });

  it('should reject strings with newlines', () => {
    expect(() => assertValidTenantId('123e4567-e89b-12d3-a456-426614174000\n')).toThrow('SECURITY_ERROR');
  });

  it('should reject arbitrary non-UUID strings', () => {
    expect(() => assertValidTenantId('some-tenant-name')).toThrow('SECURITY_ERROR');
    expect(() => assertValidTenantId('null')).toThrow('SECURITY_ERROR');
    expect(() => assertValidTenantId('undefined')).toThrow('SECURITY_ERROR');
  });
});
