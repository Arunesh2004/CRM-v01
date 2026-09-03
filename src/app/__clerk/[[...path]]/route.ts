/**
 * Clerk Frontend API Proxy Route Handler
 *
 * This route is required when NEXT_PUBLIC_CLERK_PROXY_URL is set to /__clerk.
 * It proxies all Clerk JS bundle and API requests through the application domain,
 * which:
 *   - Prevents ad-blockers from blocking clerk.com requests
 *   - Improves security by keeping all auth traffic within the app domain
 *   - Serves clerk.browser.js from /__clerk/npm/... paths
 *
 * Without this route, the frontend receives 404 for all /__clerk/* requests,
 * causing a blank/broken sign-in page.
 *
 * Reference: @clerk/nextjs v7.6.5 proxy documentation
 * API: createFrontendApiProxyHandlers() from '@clerk/nextjs/server'
 */
import { createFrontendApiProxyHandlers } from '@clerk/nextjs/server';

export const runtime = 'edge';

export const { GET, POST, PUT, DELETE, PATCH } = createFrontendApiProxyHandlers();
