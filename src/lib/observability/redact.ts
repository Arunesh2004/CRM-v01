import { getContext } from './context';

const SENSITIVE_KEYS = new Set([
  'password', 'token', 'accesstoken', 'refreshtoken', 'apikey', 'secret', 
  'authorization', 'cookie', 'set-cookie', 'set_cookie', 'clientsecret', 'webhooksecret',
  'privatekey'
]);

function maskEmail(email: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '[REDACTED]';
  return email.replace(/(?<=.).(?=.*@)/g, '*');
}

// Helper to check if a URL/string contains a token and redact the query param
function redactUrlSecrets(str: string): string {
  // Target known query parameter patterns: ?token=XXXX or &secret=XXXX
  let redacted = str.replace(/([?&](?:token|secret|key|password)=)([^&\s"'<>]+)/gi, '$1[REDACTED]');
  
  // Target auth headers in raw strings
  redacted = redacted.replace(/(Bearer|Basic)\s+[A-Za-z0-9-._~+/]+=*/gi, '$1 [REDACTED]');
  
  // Target basic auth in URLs (http://user:pass@host)
  redacted = redacted.replace(/(:\/\/[^:]+:)([^@]+)(@)/gi, '$1[REDACTED]$3');

  return redacted;
}

export function redact(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return redactUrlSecrets(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redact(item));
  }

  if (typeof obj === 'object') {
    if (obj instanceof Error) {
      const errObj: any = {
        name: obj.name,
        message: redactUrlSecrets(obj.message),
        stack: process.env.NODE_ENV === 'production' ? undefined : redactUrlSecrets(obj.stack || '')
      };
      
      // Also redact custom error properties that might contain PII or payloads
      for (const [key, value] of Object.entries(obj)) {
        if (key !== 'name' && key !== 'message' && key !== 'stack') {
           if (SENSITIVE_KEYS.has(key.toLowerCase())) {
             errObj[key] = '[REDACTED]';
           } else if (key.toLowerCase() === 'email' && typeof value === 'string') {
             errObj[key] = maskEmail(value);
           } else if (key.toLowerCase() === 'html' && typeof value === 'string') {
             errObj[key] = redactUrlSecrets(value);
           } else {
             errObj[key] = redact(value);
           }
        }
      }
      return errObj;
    }

    const redactedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        redactedObj[key] = '[REDACTED]';
      } else if (key.toLowerCase() === 'email' && typeof value === 'string') {
        redactedObj[key] = maskEmail(value);
      } else if (key.toLowerCase() === 'html' && typeof value === 'string') {
        // specifically target embedded URLs/tokens in HTML instead of dropping it entirely
        redactedObj[key] = redactUrlSecrets(value);
      } else {
        redactedObj[key] = redact(value);
      }
    }
    return redactedObj;
  }

  return obj;
}

export function injectContext(context: Record<string, any> = {}): Record<string, any> {
  const asyncCtx = getContext();
  if (asyncCtx) {
    if (asyncCtx.requestId && !context.requestId) {
      context.requestId = asyncCtx.requestId;
    }
    if (asyncCtx.tenantId && !context.tenantId) {
      context.tenantId = asyncCtx.tenantId;
    }
    if (asyncCtx.jobId && !context.jobId) {
      context.jobId = asyncCtx.jobId;
    }
  }
  return context;
}
