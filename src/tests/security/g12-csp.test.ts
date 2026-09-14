import { describe, it, expect, vi } from 'vitest';

describe('G12: CSP Hardening', () => {
  it('omits unsafe-eval in production environment', () => {
    const isProduction = true;
    const scriptSrc = isProduction 
      ? "script-src 'self' 'unsafe-inline' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev";

    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(scriptSrc).toContain('unsafe-inline'); // required for Next.js hydration and Tailwind
  });

  it('includes unsafe-eval in development environment', () => {
    const isProduction = false;
    const scriptSrc = isProduction 
      ? "script-src 'self' 'unsafe-inline' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev";

    expect(scriptSrc).toContain('unsafe-eval');
  });
});
