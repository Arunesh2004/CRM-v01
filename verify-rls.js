const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRLS() {
  try {
    const tables = ['CameraStreamInvalidation', 'AIAnalysisJob'];
    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe(`
        SELECT relrowsecurity, relforcerowsecurity 
        FROM pg_class 
        WHERE relname = '${table}';
      `);
      
      const policies = await prisma.$queryRawUnsafe(`
        SELECT policyname, cmd, permissive 
        FROM pg_policies 
        WHERE tablename = '${table}';
      `);
      
      console.log(`\nTable: ${table}`);
      console.log(`RLS Enabled:`, result);
      console.log(`Policies:`, policies);
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
checkRLS();
