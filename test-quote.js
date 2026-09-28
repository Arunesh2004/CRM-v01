require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    const quote = await prisma.quote.findUnique({ 
      where: { id: '05eb62ff-a75c-4f03-9d4c-2c50f89f9015' },
      include: { lineItems: true }
    });
    console.log("Quote found:", quote);
    
    if (quote) {
      const rules = await prisma.discountRule.findMany({ 
        where: { tenantId: quote.tenantId, priceBookId: quote.priceBookId, isActive: true },
        orderBy: { priority: 'desc' }
      });
      console.log("Rules:", rules);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
