import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

export interface RequestContext {
  requestId?: string;
  tenantId?: string;
  jobId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

const isValidId = (id: string) => /^[a-zA-Z0-9-]{1,64}$/.test(id);

export function withContext<T>(
  context: Partial<RequestContext>,
  fn: () => T
): T {
  const current = requestContext.getStore();
  
  // Validate incoming IDs but do not fabricate for background jobs without one
  let requestId = context.requestId;
  if (requestId && !isValidId(requestId)) {
    requestId = undefined;
  }

  // Tenant ID from context is diagnostic ONLY, MUST NOT be derived from untrusted headers
  const newContext: RequestContext = {
    ...current,
    requestId: requestId || current?.requestId,
    tenantId: context.tenantId || current?.tenantId,
    jobId: context.jobId || current?.jobId,
  };

  return requestContext.run(newContext, fn);
}

export function getContext(): RequestContext | undefined {
  return requestContext.getStore();
}

// Next.js Route Handler signature types
import type { NextRequest, NextResponse } from 'next/server';

export function withApiContext<TContext = unknown>(
  handler: (req: NextRequest, context: TContext) => Promise<NextResponse | Response> | NextResponse | Response
) {
  return async (req: NextRequest, context?: TContext) => {
    const incomingId = req.headers.get('x-correlation-id');
    const requestId = (incomingId && isValidId(incomingId)) ? incomingId : crypto.randomUUID();

    // IMPORTANT: We do NOT set tenantId here.
    // The CRM tenantId is NOT the Clerk orgId — it is resolved from the database:
    //   Clerk userId → DB User.clerkId lookup → User.tenantId
    // Setting orgId as tenantId would be incorrect and potentially unsafe.
    // Tenant context in observability is populated by the business logic layer
    // (e.g. withJobContext) after the DB-level tenant resolution is complete.
    // requestId-only context is correct and sufficient at the API boundary.
    return withContext({ requestId }, () => handler(req, context as TContext));
  };
}

/**
 * Populates the tenant ID into the *existing* observability context.
 * MUST NOT be called with untrusted headers.
 * 
 * Conflict Rules:
 * - no tenant in context -> set tenant A
 * - tenant A already present -> allow tenant A
 * - tenant B already present -> THROW Error
 * - no context -> do nothing
 */
export function setTenantContext(tenantId: string) {
  const current = requestContext.getStore();
  if (current) {
    if (current.tenantId && current.tenantId !== tenantId) {
      throw new Error(`Context Conflict: Attempted to overwrite existing tenant ${current.tenantId} with ${tenantId}`);
    }
    current.tenantId = tenantId;
  }
}
