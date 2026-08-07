import prisma from '../database/utils/prisma';
import fs from 'fs';
import { ensureUserProvisioned } from '../src/modules/auth/services/provisioning.service';

const logs: any[] = [];

function log(module: string, status: string, message: string, evidence?: any) {
  const entry = { module, status, message, evidence };
  logs.push(entry);
  console.log(`[${module}] [${status}] ${message}`);
}

async function run() {
  console.log('Starting Enterprise Runtime Audit...\n');

  // 1. Setup Data
  const mockClerkUser = {
    id: 'runtime_test_user_2',
    emailAddresses: [{ emailAddress: 'runtime2@acme.com' }],
    firstName: 'Runtime2',
    lastName: 'Tester',
    publicMetadata: {}
  };
  
  let tenantId;
  let userId;

  try {
    const user = await ensureUserProvisioned(mockClerkUser);
    tenantId = user.tenantId;
    userId = user.id;
    process.env.TEST_CLERK_ID = user.clerkId;
    log('Authentication', '✅ VERIFIED', 'Provisioned user successfully', user);
  } catch (e: any) {
    log('Authentication', '❌ FAILED', 'Failed to provision user', e.stack);
    return;
  }

  // 2. CRM Execution
  let leadId;
  try {
    const { createLead } = await import('../src/modules/crm/lead/lead.service');
    const lead = await createLead({
      name: 'John Doe',
      company: 'Test Corp',
      email: 'john@example.com'
    });
    leadId = lead.id;
    log('CRM', '✅ VERIFIED', 'Lead created successfully', lead);
  } catch (e: any) {
    log('CRM', '❌ FAILED', 'Failed to create lead', e.stack);
  }

  // 3. Telephony Execution
  try {
    const { createCall } = await import('../src/modules/communication/telephony/telephony.service');
    const call = await createCall({
      to: '+0987654321',
      from: '+1234567890'
    });
    log('Communication', '⚠️ PARTIALLY VERIFIED', 'Call initiated but no WebRTC backend', call);
  } catch (e: any) {
    log('Communication', '❌ FAILED', 'Failed to initiate call', e.stack);
  }

  // 4. CCTV Execution
  let cameraId;
  try {
    const { createCamera } = await import('../src/modules/cctv/camera.service');
    const cam = await createCamera({
      locationId: 'non_existent',
      name: 'Lobby Cam',
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      model: 'Test',
      manufacturer: 'Test',
    });
    cameraId = cam.id;
    log('CCTV', '⚠️ PARTIALLY VERIFIED', 'Camera registered', cam);
  } catch (e: any) {
    log('CCTV', '❌ FAILED', 'Failed to register camera', e.stack);
  }

  // 5. Reporting Execution
  try {
    const { getDashboardMetrics } = await import('../src/modules/reporting/reporting.service');
    const metrics = await getDashboardMetrics();
    log('Reporting', '✅ VERIFIED', 'Dashboard metrics executed', metrics);
  } catch (e: any) {
    log('Reporting', '❌ FAILED', 'Failed to fetch reporting metrics', e.stack);
  }

  // 6. Database Verification
  try {
    const totalTenants = await prisma.tenant.count();
    const totalUsers = await prisma.user.count();
    log('Database', '✅ VERIFIED', 'Database queries successful', { totalTenants, totalUsers });
  } catch (e: any) {
    log('Database', '❌ FAILED', 'Database queries failed', e.stack);
  }

  // Final Output
  fs.writeFileSync('runtime-audit-logs.json', JSON.stringify(logs, null, 2));
  console.log('\nAudit complete. Logs saved to runtime-audit-logs.json');
}

run().catch(console.error).finally(() => prisma.$disconnect());
