import prisma from '../database/utils/prisma';
import { Prisma } from '@prisma/client';

const ext = Prisma.defineExtension({
  query: {
    $allModels: {
      async $allOperations({ query, args }) {
        console.log('Extension triggered');
        return query(args);
      }
    }
  }
});

async function run() {
  await prisma.$transaction(async (tx) => {
    try {
      const extTx = (tx as any).$extends(ext);
      await extTx.user.findFirst();
      console.log('Success!');
    } catch (e) {
      console.error('Failed:', e);
    }
  });
}
run();
