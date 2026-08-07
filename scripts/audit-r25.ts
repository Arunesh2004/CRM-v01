import prisma from '../database/utils/prisma';
import fs from 'fs';
import { ensureUserProvisioned } from '../src/modules/auth/services/provisioning.service';
import { askAssistant } from '../src/modules/ai/assistant.service';
import { createIncident } from '../src/modules/incident/incident.service';
import { getSecurityMetrics } from '../src/modules/reporting/reporting.service';

const logs: any[] = [];
function log(feature: string, command: string, response: any, stack: string = '') {
  logs.push({ feature, command, response, stack });
}

async function run() {
  let tenantId;
  try {
    const user = await ensureUserProvisioned({
      id: 'r25_user', emailAddresses: [{ emailAddress: 'r25@test.com' }], firstName: 'R', lastName: '25', publicMetadata: {}
    });
    tenantId = user.tenantId;
    process.env.TEST_CLERK_ID = user.clerkId;
    log('Provisioning', 'ensureUserProvisioned()', user);
  } catch (e: any) { return log('Provisioning', 'ensureUserProvisioned()', null, e.stack); }

  try {
    const aiResp = await askAssistant('How many incidents are there?');
    log('AI Assistant', 'askAssistant()', aiResp);
  } catch (e: any) { log('AI Assistant', 'askAssistant()', null, e.stack); }

  try {
    const incident = await createIncident({ locationId: 'dummy', title: 'Test Incident', severity: 'HIGH' });
    log('Incident CRUD', 'createIncident()', incident);
  } catch (e: any) { log('Incident CRUD', 'createIncident()', null, e.stack); }

  try {
    const metrics = await getSecurityMetrics();
    log('Reporting Metrics', 'getSecurityMetrics()', metrics);
  } catch (e: any) { log('Reporting Metrics', 'getSecurityMetrics()', null, e.stack); }

  fs.writeFileSync('audit-r25-logs.json', JSON.stringify(logs, null, 2));
}

run().finally(() => prisma.$disconnect());
