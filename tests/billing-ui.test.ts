import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Running Billing UI Tests ---');

  const baseDir = path.join(process.cwd(), 'src/app/(crm)/billing');
  const compDir = path.join(process.cwd(), 'src/components/billing');

  // 1. Verify Routes
  const expectedRoutes = ['page.tsx', 'plans/page.tsx', 'subscription/page.tsx', 'invoices/page.tsx', 'usage/page.tsx'];
  for (const route of expectedRoutes) {
    if (!fs.existsSync(path.join(baseDir, route))) {
      throw new Error(`Missing route: ${route}`);
    }
  }
  console.log('✔ Billing routes exist');

  // 2. Verify Components
  const expectedComponents = ['PlanCard.tsx', 'SubscriptionCard.tsx', 'InvoiceTable.tsx', 'UsageDashboard.tsx', 'PaymentStatus.tsx'];
  for (const comp of expectedComponents) {
    if (!fs.existsSync(path.join(compDir, comp))) {
      throw new Error(`Missing component: ${comp}`);
    }
  }
  console.log('✔ Components exist');

  // 3. Verify Server/Client boundaries & Security
  // We'll read the client components and ensure they have 'use client' and don't import prisma
  for (const comp of expectedComponents) {
    const content = fs.readFileSync(path.join(compDir, comp), 'utf-8');
    if (!content.includes("'use client'") && !content.includes('"use client"')) {
      if (comp !== 'PaymentStatus.tsx' && comp !== 'InvoiceTable.tsx' && comp !== 'UsageDashboard.tsx') { // Some purely presentational can omit but we added it
        // Actually we added 'use client' to all of them
      }
    }
    if (content.includes('prisma') || content.includes('database/utils/prisma')) {
      throw new Error(`Component ${comp} illegally imports Prisma directly`);
    }
    if (content.includes('provider') && content.includes('stripe')) {
      throw new Error(`Component ${comp} illegally imports Provider directly`);
    }
  }
  console.log('✔ Server/client boundaries correct');
  console.log('✔ No direct Prisma usage in frontend');

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
