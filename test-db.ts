import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenantId = '00000000-0000-4000-8000-00000000000a';
  const userId = '00000000-0000-4000-8000-000000000001';
  
  const conversations = await prisma.chatConversation.findMany({
    where: { tenantId, participants: { some: { userId } } },
    include: { participants: { include: { user: true } } }
  });
  console.log(JSON.stringify(conversations, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
