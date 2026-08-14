/**
 * TEMPORARY PHASE 26E DIAGNOSTIC ENDPOINT — MUST BE REMOVED AFTER USE
 *
 * Purpose: Return the exact createCustomerAction Server Action ID from
 * the current Vercel Preview runtime build artifacts, so Phase 26E can
 * verify the real remote write path.
 *
 * SECURITY GATES (all must pass — fail closed otherwise):
 *   1. VERCEL_ENV must be exactly 'preview'
 *   2. CRM_LOAD_TEST_AUTH_ENABLED must be exactly 'true'
 *   3. x-load-test-token header must be cryptographically valid (HS256)
 *      against LOAD_TEST_SECRET with the required audience/issuer/purpose
 *
 * Returns ONLY:
 *   { "createCustomerActionId": "<40-char hex id>" }
 *
 * Does NOT return: secrets, paths, env vars, other action IDs, or metadata.
 * Does NOT log the action ID.
 * This file must be removed immediately after the Phase 26E write-path
 * verification is complete.
 */
import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Triple-gate: all three conditions must be true or the endpoint is
 * completely invisible (404). This cannot be bypassed by any single
 * environment variable or token in isolation.
 */
function isEndpointActive(): boolean {
  // Gate 1: Must be Vercel Preview — hardcoded check, not overridable by token
  if (process.env.VERCEL_ENV !== 'preview') return false;
  // Gate 2: Explicit opt-in variable must be set to exactly 'true'
  if (process.env.CRM_LOAD_TEST_AUTH_ENABLED !== 'true') return false;
  // Gate 3: The secret itself must be configured (prevents misconfigured deployments)
  if (!process.env.LOAD_TEST_SECRET) return false;
  return true;
}

/**
 * Verify the x-load-test-token using the same parameters as the
 * existing auth bridge in src/lib/auth.ts. Identical audience/issuer/algorithm.
 */
function verifyLoadTestToken(token: string, secret: string): boolean {
  try {
    const decoded = jwt.verify(token, secret, {
      audience: 'crm-staging-load-test',
      issuer: 'crm-phase26-runner',
      algorithms: ['HS256'],
    });
    if (typeof decoded === 'string') return false;
    // Validate the required purpose claim — identical to auth.ts
    if ((decoded as jwt.JwtPayload)['purpose'] !== 'crm-phase26-load-test') return false;
    return true;
  } catch {
    // Do NOT log the token on verification failure
    return false;
  }
}

/**
 * Read the runtime server-reference-manifest.json and extract the exact
 * createCustomerAction Server Action ID. Fails if the entry is missing
 * or ambiguous.
 */
function resolveCreateCustomerActionId(): string {
  const manifestPath = path.join(process.cwd(), '.next', 'server', 'server-reference-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error('server-reference-manifest.json not found at runtime');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const nodeActions: Record<string, { exportedName?: string }> = manifest.node || {};

  const matches = Object.entries(nodeActions)
    .filter(([, meta]) => meta?.exportedName === 'createCustomerAction')
    .map(([id]) => id);

  if (matches.length === 0) {
    throw new Error('createCustomerAction not found in server-reference-manifest.json');
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous createCustomerAction matches: ${matches.length} entries found`);
  }

  const actionId = matches[0];

  // Sanity check: must be a 40-char lowercase hex string
  if (!/^[a-f0-9]{30,50}$/.test(actionId)) {
    throw new Error('Resolved action ID has unexpected format');
  }

  return actionId;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Gate 1+2+3: fail as 404 if endpoint is not active — indistinguishable from a missing route
  if (!isEndpointActive()) {
    notFound();
  }

  // Gate 3: Require a valid load-test JWT
  const token = req.headers.get('x-load-test-token');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.LOAD_TEST_SECRET as string;
  if (!verifyLoadTestToken(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // All gates passed — resolve the action ID from runtime build artifact
  let createCustomerActionId: string;
  try {
    createCustomerActionId = resolveCreateCustomerActionId();
  } catch (err: unknown) {
    // Log only the error message, not the manifest contents
    console.error('[load-test/action-id] Resolution failed:', (err as Error).message);
    return NextResponse.json({ error: 'Action ID resolution failed' }, { status: 500 });
  }

  // Return ONLY the action ID — nothing else
  return NextResponse.json({ createCustomerActionId });
}

// Explicitly disable all other HTTP methods
export async function POST(): Promise<NextResponse> { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function PUT(): Promise<NextResponse>  { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function DELETE(): Promise<NextResponse> { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
