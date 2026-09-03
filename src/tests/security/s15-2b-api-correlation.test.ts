import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withApiContext, getContext } from '../../lib/observability/context';

// Mock clerk to provide a predictable tenantId
vi.mock('@clerk/nextjs/server', () => ({
  getAuth: (req: any) => {
    if (req.headers.get('Authorization') === 'Bearer valid') {
      return { orgId: 'tenant-123' };
    }
    return null;
  }
}));

describe('S15.2B API Correlation Wrapper', () => {
  it('should generate a new requestId if none provided', async () => {
    const req = new NextRequest('http://localhost/api/test');
    
    let capturedContext: any = null;
    const handler = async () => {
      capturedContext = getContext();
      return NextResponse.json({ ok: true });
    };

    const wrapped = withApiContext(handler);
    await wrapped(req, {});
    
    expect(capturedContext).toBeDefined();
    expect(capturedContext.requestId).toBeDefined();
    expect(typeof capturedContext.requestId).toBe('string');
    expect(capturedContext.requestId.length).toBeGreaterThan(10);
  });

  it('should preserve a valid incoming x-correlation-id', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-correlation-id': 'valid-id-123' }
    });
    
    let capturedContext: any = null;
    const handler = async () => {
      capturedContext = getContext();
      return NextResponse.json({ ok: true });
    };

    const wrapped = withApiContext(handler);
    await wrapped(req, {});
    
    expect(capturedContext.requestId).toBe('valid-id-123');
  });

  it('should reject unsafe/oversized correlation IDs', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-correlation-id': 'a'.repeat(100) } // Over 64 chars
    });
    
    let capturedContext: any = null;
    const handler = async () => {
      capturedContext = getContext();
      return NextResponse.json({ ok: true });
    };

    const wrapped = withApiContext(handler);
    await wrapped(req, {});
    
    expect(capturedContext.requestId).not.toBe('a'.repeat(100));
    expect(capturedContext.requestId.length).toBeLessThanOrEqual(64);
  });

  it('should NOT extract tenantId at the API boundary', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 
        'Authorization': 'Bearer valid',
        'x-tenant-id': 'hacked-tenant' 
      }
    });
    
    let capturedContext: any = null;
    const handler = async () => {
      capturedContext = getContext();
      return NextResponse.json({ ok: true });
    };

    const wrapped = withApiContext(handler);
    await wrapped(req, {});
    
    // Tenant ID is resolved in business logic, NOT at the API boundary.
    // The wrapper must leave it undefined.
    expect(capturedContext.tenantId).toBeUndefined();
  });

  it('should isolate concurrent requests', async () => {
    const req1 = new NextRequest('http://localhost/api/test', { headers: { 'x-correlation-id': 'req-1' } });
    const req2 = new NextRequest('http://localhost/api/test', { headers: { 'x-correlation-id': 'req-2' } });
    
    let context1: any;
    let context2: any;

    const handler1 = async () => {
      await new Promise(r => setTimeout(r, 10)); // Yield event loop
      context1 = getContext();
      return NextResponse.json({ ok: true });
    };

    const handler2 = async () => {
      context2 = getContext();
      return NextResponse.json({ ok: true });
    };

    const wrapped1 = withApiContext(handler1);
    const wrapped2 = withApiContext(handler2);

    await Promise.all([
      wrapped1(req1, {}),
      wrapped2(req2, {})
    ]);

    expect(context1.requestId).toBe('req-1');
    expect(context2.requestId).toBe('req-2');
  });
});
