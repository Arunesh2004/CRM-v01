/**
 * Strictly validates a tenant ID to prevent SQL injection in raw parameterless queries.
 * Only accepts valid UUID formats (versions 1-5).
 * Throws a security-oriented error if validation fails.
 */
export function assertValidTenantId(tenantId: string): void {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('SECURITY_ERROR: Tenant ID must be a non-empty string.');
  }

  // Strict regex for UUID format (hexadecimals and hyphens only)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(tenantId)) {
    throw new Error('SECURITY_ERROR: Malformed Tenant ID. Must be a valid UUID to prevent injection.');
  }
}
