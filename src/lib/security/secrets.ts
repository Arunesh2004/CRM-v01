export function isSecretExposedToFrontend(envKey: string): boolean {
  // In Next.js, keys prefixed with NEXT_PUBLIC_ are bundled to the client.
  // Sensitive keys (DB URLs, Stripe secrets, AWS secrets) MUST NOT have this prefix.
  const sensitiveKeywords = ['SECRET', 'PASSWORD', 'TOKEN', 'KEY', 'DATABASE_URL', 'STRIPE'];
  const isPublic = envKey.startsWith('NEXT_PUBLIC_');
  const containsSensitive = sensitiveKeywords.some(keyword => envKey.toUpperCase().includes(keyword));
  
  if (isPublic && containsSensitive) {
    // Exceptions like NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY are allowed, but generally this is dangerous.
    if (envKey.includes('PUBLISHABLE') || envKey.includes('FRONTEND')) return false;
    return true;
  }
  return false;
}

export function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '[REDACTED]';
  const visibleStart = secret.substring(0, 3);
  const visibleEnd = secret.substring(secret.length - 3);
  return `${visibleStart}...${visibleEnd}`;
}
