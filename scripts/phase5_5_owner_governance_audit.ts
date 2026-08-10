import { PrismaClient } from '@prisma/client';
import * as auth from '../src/lib/auth';

const prisma = new PrismaClient();

let currentUser: any = null;
(auth as any).getCurrentUser = async () => currentUser;

async function checkPermission(resource: string, action: string) {
  const user = currentUser;
  if (!user) return false;
  for (const userRole of user.userRoles) {
    if (userRole.role.name === 'OWNER' || userRole.role.name === 'TENANT_ADMIN' || userRole.role.name === 'GLOBAL_ADMIN') {
      return true;
    }
    const hasPermission = userRole.role.permissions.some(
      (rp: any) => rp.permission.resource === resource && rp.permission.action === action
    );
    if (hasPermission) return true;
  }
  return false;
}

async function runAudit() {
  const report: any = { results: {} };

  try {
    const tenantId = 'p55-tenant';
    await prisma.tenant.upsert({ where: { id: tenantId }, update: {}, create: { id: tenantId, name: 'T55' } });
    
    // Create actual owner
    const owner = await prisma.user.upsert({ where: { clerkId: 'owner55' }, update: {}, create: { tenantId, clerkId: 'owner55', email: 'owner@t55' } });
    await prisma.tenant.update({ where: { id: tenantId }, data: { ownerId: owner.id } }).catch(()=>null);
    
    // Create employee
    const emp = await prisma.user.upsert({ where: { clerkId: 'emp55' }, update: {}, create: { tenantId, clerkId: 'emp55', email: 'emp@t55' } });
    
    // Employee maliciously gets OWNER role assigned (e.g. via insecure API)
    const ownerRole = await prisma.role.findFirst({ where: { name: 'OWNER', tenantId }}) || await prisma.role.create({ data: { name: 'OWNER', tenantId }});
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: emp.id, roleId: ownerRole.id } }, update: {}, create: { userId: emp.id, roleId: ownerRole.id } }).catch(()=>null);

    const empFull = await prisma.user.findUnique({ where: { id: emp.id }, include: { tenant: true, userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    
    currentUser = empFull;
    
    // Test auth.ts bypass
    const hasBypass = await checkPermission('ANY_RESOURCE', 'ANY_ACTION');
    report.results['Employee_Gets_Owner_Role_Bypass'] = hasBypass ? 'VULNERABLE (Gained bypass)' : 'SECURE';

    console.log(JSON.stringify(report, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
