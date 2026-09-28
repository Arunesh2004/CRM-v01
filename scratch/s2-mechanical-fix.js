const fs = require('fs');
const path = require('path');
const BASE = path.resolve(__dirname, '..');

function patch(relPath, fn) {
  const full = path.join(BASE, relPath);
  let c;
  try { c = fs.readFileSync(full, 'utf8'); } catch(e) { console.log('NOT FOUND:', relPath); return; }
  const before = c;
  c = fn(c);
  if (c === before) {
    console.log('SKIP (no change):', relPath);
  } else {
    fs.writeFileSync(full, c, 'utf8');
    console.log('PATCHED:', relPath);
  }
}

// 1. Remove unused EventBus imports (confirmed no body usage in both files)
['src/modules/crm/task/task.core.ts', 'src/modules/crm/task/task.service.ts'].forEach(f => {
  patch(f, c => c.replace(/import \{ EventBus \} from ['"][^'"]+['"];\r?\n/, ''));
});

// 2. Remove unused 'inngest' import from ai workflow service
patch('src/modules/ai/workflow/workflow.service.ts', c =>
  c.replace(/import \{ inngest \} from ['"][^'"]+['"];\r?\n/, '')
);

// 3. Remove unused 'prisma' default import from revenue.workflows.ts
patch('src/lib/queue/functions/revenue.workflows.ts', c =>
  c.replace(/import prisma from ['"][^'"]+prisma['"];\r?\n/, '')
);

// 4. Remove unused 'realtime' import from presence.actions.ts
patch('src/modules/communication/actions/presence.actions.ts', c =>
  c.replace(/import \{ realtime \} from ['"][^'"]+['"];\r?\n/, '')
);

// 5. Remove unused 'globalPrisma' import from cctv.vision.ts
patch('src/lib/queue/functions/cctv.vision.ts', c =>
  c.replace(/import globalPrisma from ['"][^'"]+['"];\r?\n/, '')
);

// 6. Fix unused 'prisma' assigned to withTenant() — never used in customer, deal, lead services
// These are lines like `  const prisma = withTenant(tenantId);\n` that have no reads after them
['src/modules/crm/customer/customer.service.ts',
 'src/modules/crm/deal/deal.service.ts',
 'src/modules/crm/lead/lead.service.ts'].forEach(f => {
  patch(f, c => c.replace(/\n  const prisma = withTenant\(tenantId\);\n/g, '\n'));
});

// 7. notification.worker.ts: unused 'notification' assigned value (never read after assignment)
patch('src/lib/queue/functions/notification.worker.ts', c =>
  c.replace(/\bconst notification = /g, 'const _notification = ')
);

// 8. outbox.worker.ts: unused 'tx' in withJobContext callbacks — prefix with _
patch('src/lib/queue/functions/outbox.worker.ts', c =>
  c.replace(/withJobContext\(event\.data, async \(tx\)/g, 'withJobContext(event.data, async (_tx)')
);

// 9. load-test-mock.provider.ts: interface method unused params — prefix with _
patch('src/lib/providers/load-test-mock.provider.ts', c => {
  c = c.replace(/\(tenantId: string, payload: any\): Promise<any>/, '(tenantId: string, _payload: any): Promise<any>');
  c = c.replace(/\(cameraId: string\): Promise<any>/, '(_cameraId: string): Promise<any>');
  c = c.replace(/\(prompt: any\): Promise<any>/, '(_prompt: any): Promise<any>');
  c = c.replace(/\(tenantId: string, systemPrompt: string, userPrompt: string, tools\?: AITool\[\]\)/, '(tenantId: string, _systemPrompt: string, _userPrompt: string, _tools?: AITool[])');
  return c;
});

// 10. pusher.provider.ts: unused 'payload' in interface method params
patch('src/lib/providers/realtime/pusher.provider.ts', c =>
  c.replace(/\(tenantId: string, payload: ([^)]+)\)/g, '(tenantId: string, _payload: $1)')
);

// 11. adapter.ts: unused 'payload' in interface method params
patch('src/modules/communication/adapter.ts', c =>
  c.replace(/, payload: any\)/g, ', _payload: any)')
);

// 12. twilio.provider.ts: unused url/destPath locals
patch('src/lib/providers/telephony/twilio.provider.ts', c =>
  c.replace(/\bconst url = /g, 'const _url = ').replace(/\bconst destPath = /g, 'const _destPath = ')
);

// 13. cctv.vision.ts: unused 'e' in catch clause
patch('src/lib/queue/functions/cctv.vision.ts', c =>
  c.replace(/\} catch \(e\) \{/g, '} catch (_e) {')
);

// 14. camera.service.ts: unused 'oldCameraForInvalidation'
patch('src/modules/cctv/camera.service.ts', c =>
  c.replace(/\bconst oldCameraForInvalidation = /g, 'const _oldCameraForInvalidation = ')
);

// 15. stream.service.ts: unused destructure params in function signature
patch('src/modules/cctv/stream.service.ts', c =>
  c.replace(/\{ tenantId, camera, credential \}/g, '{ tenantId: _tenantId, camera: _camera, credential: _credential }')
);

console.log('\nDone.');
