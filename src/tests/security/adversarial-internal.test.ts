import { describe, it, expect } from 'vitest';

// Simulating unauthenticated / unauthorized requests to internal endpoints
// In a real environment, these would be E2E HTTP tests.
// Here we are testing the handlers directly or via a mock fetch if Next.js test utilities were available.
// Since Next.js App Router route handlers require a Request object, we can construct one.
import { GET as diagnosticGET } from '../../app/api/export/route';
import { GET as healthGET } from '../../app/api/health/route';
import { NextRequest } from 'next/server';

// We must mock requireAuth and requireTenant for these tests to simulate unauthenticated access.
// Vitest supports vi.mock, but it might interfere with other tests if not careful.
// Let's rely on the fact that without headers, requireAuth throws an error.

describe('Adversarial Internal & Admin Surface (Stage 17 & 18)', () => {
  it('ATTACK: Access diagnostic export without authentication (Stage 17)', async () => {
    const req = new NextRequest('http://localhost/api/export?type=diagnostic', { method: 'GET' });
    
    // We expect this to fail with 500 or 401 because we have no Clerk auth headers
    const res = await diagnosticGET(req);
    
    // It should NOT be 200 OK. 
    expect(res.status).not.toBe(200);
    
    const body = await res.json();
    
    // Stage 18: Verify error disclosure is sanitized.
    // It should not leak Prisma or DB strings.
    const errorString = JSON.stringify(body);
    expect(errorString).not.toContain('prisma');
    expect(errorString).not.toContain('stack');
  });

  it('ATTACK: Access health check endpoint (Stage 17)', async () => {
    // Health check is meant to be public, but let's check its disclosure
    const req = new NextRequest('http://localhost/api/health', { method: 'GET' });
    const res = await healthGET();
        expect(res.status).toBe(200); // Health check succeeds in local test environment
    
    const body = await res.json();
    expect(body.database).toBeDefined();
    // Ensure it doesn't leak connection string
    const bodyString = JSON.stringify(body);
    expect(bodyString).not.toContain('postgres://');
  });

  it('ATTACK: Fuzz export endpoint with malformed types (Stage 18)', async () => {
    const req = new NextRequest('http://localhost/api/export?type=MALICIOUS_INJECTION_TYPE', { method: 'GET' });
    
    const res = await diagnosticGET(req);
    
    // Auth will fail first.
    expect(res.status).not.toBe(200);
    const body = await res.json();
    const errorString = JSON.stringify(body);
    expect(errorString).not.toContain('PrismaClientKnownRequestError');
  });
});
