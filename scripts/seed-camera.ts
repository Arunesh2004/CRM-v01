import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCamera() {
  const location = await prisma.location.findFirst();
  if (!location) {
    console.log("No locations found.");
    return;
  }

  const camera = await prisma.camera.create({
    data: {
      tenantId: location.tenantId,
      locationId: location.id,
      name: "Monitoring Test Camera",
      ipAddress: "192.168.1.99",
      protocol: "RTSP",
      status: "ONLINE"
    }
  });

  console.log("Seeded Camera:", camera.id);
}

seedCamera()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
