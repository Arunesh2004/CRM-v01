/**
 * PHASE 26 — STAGING AUDIT USER PROVISIONING SCRIPT
 *
 * Creates exactly 5 dedicated AUDIT_LOAD_* users and tenants for load testing.
 * - Idempotent: safe to run multiple times.
 * - Never touches real users or production data.
 * - Writes generated IDs to .phase26-audit-users.json (gitignored).
 * - Run ONLY against staging/preview database.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json load-test/provision-audit-users.ts
 *
 * Requires:
 *   DATABASE_URL set to staging (NEVER production).
 */

import prisma from '../database/utils/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const AUDIT_USERS = [
  { label: 'AUDIT_LOAD_A', email: 'audit-load-a@phase26.staging.internal' },
  { label: 'AUDIT_LOAD_B', email: 'audit-load-b@phase26.staging.internal' },
  { label: 'AUDIT_LOAD_C', email: 'audit-load-c@phase26.staging.internal' },
  { label: 'AUDIT_LOAD_D', email: 'audit-load-d@phase26.staging.internal' },
  { label: 'AUDIT_LOAD_E', email: 'audit-load-e@phase26.staging.internal' },
];

const OUTPUT_FILE = path.join(__dirname, '../.phase26-audit-users.json');

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BLOCKED: This script must not run against production.');
  }

  console.log('[Phase26] Starting idempotent audit user provisioning...');

  const results: Record<string, { userId: string; tenantId: string; email: string }> = {};

  // Load existing output to reuse stable IDs across re-runs
  let existingOutput: Record<string, any> = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    existingOutput = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log('[Phase26] Loaded existing audit user IDs from local file.');
  }

  for (const { label, email } of AUDIT_USERS) {
    // Check if user already exists in DB
    let user = await prisma.user.findFirst({ where: { email } });
    let tenant;

    if (user) {
      console.log(`[Phase26] ${label} already provisioned (id=${user.id}).`);
      tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    } else {
      console.log(`[Phase26] Provisioning ${label}...`);

      // Create tenant for this audit user
      tenant = await prisma.tenant.create({
        data: {
          name: `${label} Load-Test Tenant`,
          status: 'ACTIVE',
        },
      });

      // Create user with a synthetic clerkId (load-test path bypasses Clerk lookup)
      const syntheticClerkId = `lt_${crypto.randomUUID()}`;
      user = await prisma.user.create({
        data: {
          clerkId: syntheticClerkId,
          email,
          tenantId: tenant.id,
          status: 'ACTIVE',
        },
      });

      // Update tenant owner
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { ownerId: user.id },
      });

      // Create TENANT_ADMIN role for this tenant
      const role = await prisma.role.create({
        data: { name: 'TENANT_ADMIN', tenantId: tenant.id },
      });

      // Assign the TENANT_ADMIN role to the user
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });

      console.log(`[Phase26] Provisioned ${label}: userId=${user.id}, tenantId=${tenant.id}`);
    }

    results[label] = {
      userId: user.id,
      tenantId: tenant!.id,
      email,
    };
  }

  // Write stable IDs to local gitignored file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  console.log(`[Phase26] Audit user IDs written to ${OUTPUT_FILE} (gitignored).`);
  console.log('[Phase26] Provisioning complete.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[Phase26] Provisioning failed:', err);
  process.exit(1);
});
