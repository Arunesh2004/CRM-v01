/**
 * Validates that an input does not contain malicious HTML/Script tags.
 * In a real Next.js app, React automatically handles XSS in rendering,
 * but this is useful for sanitizing raw database inputs (e.g. CRM notes).
 */
export function sanitizeHtml(input: string): string {
  // A simple architectural scaffold. In production, use DOMPurify or xss package.
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates that a string has no suspected SQL Injection patterns.
 * Prisma already parametrizes queries, but this is a defensive depth layer.
 */
export function detectSqlInjection(input: string): boolean {
  const sqlRegex = /(\b(SELECT|UPDATE|DELETE|INSERT|DROP|ALTER|TRUNCATE|UNION)\b)|(' OR '1'='1)|(;--)/i;
  return sqlRegex.test(input);
}

/**
 * Checks for extremely large payloads to prevent DoS.
 */
export function checkPayloadLimit(payloadStr: string, limitBytes: number = 1048576): boolean { // 1MB default
  const size = Buffer.byteLength(payloadStr, 'utf8');
  return size <= limitBytes;
}
