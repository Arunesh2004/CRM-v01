import { PrismaClient } from '@prisma/client';

async function seedDemo() {
  console.log('--- Initializing Demo Production Mode Seed ---');
  const prisma = new PrismaClient();

  try {
    console.log('[1] Provisioning Demo Tenant...');
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Company Ltd',
        status: 'ACTIVE',
      },
    });

    console.log('[2] Seeding CRM Data (Leads & Customers)...');
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'Acme Corporation',
        status: 'ACTIVE'
      }
    });

    await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        name: 'Stark Industries',
        company: 'Stark Ind',
        email: 'tony@stark.demo',
        status: 'NEW'
      }
    });

    console.log('[3] Seeding CCTV Data...');
    await prisma.camera.create({
        data: {
            tenantId: tenant.id,
            name: 'Front Gate Camera',
            ipAddress: '192.168.1.100',
            protocol: 'RTSP',
            status: 'ONLINE',
            events: {
                create: {
                    tenantId: tenant.id,
                    eventType: 'MOTION',
                    severity: 'INFO',
                    metadata: { object: 'person', confidence: 0.95 }
                }
            }
        }
    });

    console.log('[4] Seeding Billing Data...');
    // Create a mock plan
    const plan = await prisma.plan.create({
        data: {
            name: 'Enterprise Demo',
            description: 'Full Platform Access',
            price: 499.00,
            currency: 'USD',
            billingCycle: 'MONTHLY',
            features: { cctv: true, crm: true, communication: true },
            isActive: true
        }
    });

    // Create a mock subscription
    const sub = await prisma.subscription.create({
        data: {
            tenantId: tenant.id,
            planId: plan.id,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            renewalDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
        }
    });

    // Create a mock invoice
    await prisma.invoice.create({
        data: {
            tenantId: tenant.id,
            subscriptionId: sub.id,
            invoiceNumber: 'INV-DEMO-001',
            amount: 499.00,
            finalAmount: 499.00,
            status: 'PAID',
            issuedAt: new Date(),
            paidAt: new Date()
        }
    });

    console.log('\\n✔ Safe Demo Seed executed successfully.');
  } catch (error) {
    console.error('Demo Seed Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemo();
