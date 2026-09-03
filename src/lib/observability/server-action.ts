import { headers } from 'next/headers';
import crypto from 'crypto';
import { withContext } from './context';

const isValidId = (id: string) => /^[a-zA-Z0-9-]{1,64}$/.test(id);

/**
 * Higher-order function to establish observability context (requestId) for Server Actions.
 * It will parse the incoming correlation ID or generate a new one.
 * Tenant ID is NOT established here; it is established securely by `requireTenant()`.
 */
export function withServerActionContext<Args extends any[], Ret>(
  action: (...args: Args) => Promise<Ret>
): (...args: Args) => Promise<Ret> {
  return async (...args: Args) => {
    let incomingId: string | null = null;
    try {
      const headersList = await headers();
      incomingId = headersList.get('x-correlation-id');
    } catch {
      // Safely ignore if headers() is unavailable outside a strict Request scope
    }

    const requestId = (incomingId && isValidId(incomingId)) ? incomingId : crypto.randomUUID();

    return withContext({ requestId }, () => action(...args));
  };
}
