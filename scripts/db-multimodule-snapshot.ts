import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function queryAllModules() {
  const [
    incidents,
    cameras,
    notifications,
    subscriptions,
    invoices,
    calls
  ] = await Promise.all([
    prisma.incident.findMany({ include: { camera: true, location: true }, orderBy: { createdAt: 'desc' } }),
    prisma.camera.findMany({ include: { location: true } }),
    (prisma as any).notification.findMany({ orderBy: { createdAt: 'desc' } }),
    (prisma as any).subscription.findMany(),
    (prisma as any).invoice.findMany(),
    (prisma as any).call.findMany(),
  ]);

  const result = { incidents, cameras, notifications, subscriptions, invoices, calls };
  fs.writeFileSync('db_multimodule_snapshot.json', JSON.stringify(result, null, 2));
  console.log('incidents:', incidents.length);
  console.log('cameras:', cameras.length);
  console.log('notifications:', notifications.length);
  console.log('subscriptions:', subscriptions.length);
  console.log('invoices:', invoices.length);
  console.log('calls:', calls.length);
}

queryAllModules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
