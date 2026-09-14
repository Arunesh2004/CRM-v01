const fs = require('fs');

let fmFile = 'src/tests/observability/failure-modes.test.ts';
let fmContent = fs.readFileSync(fmFile, 'utf8');

const mockProviderFactory = `
vi.mock('@/lib/providers/provider.factory', () => ({
  ProviderFactory: {
    getTelephonyProvider: vi.fn().mockReturnValue({
      sendSms: vi.fn().mockImplementation(async (tenantId, payload) => {
        if (payload.body === '502') return { success: false, error: '502 Bad Gateway' };
        if (payload.body === '401') return { success: false, error: 'not configured' };
        return { success: true };
      }),
      initiateCall: vi.fn()
    })
  }
}));
`;

fmContent = fmContent.replace(
  /vi\.mock\('@\/modules\/communication\/telephony\/telephony\.service'[\s\S]*?\}\)\}\)\);/,
  mockProviderFactory
);

fmContent = fmContent.replace(
  /const \{ TelephonyService \} = await import\('@\/modules\/communication\/telephony\/telephony\.service'\);\n\s*\(TelephonyService\.sendSms as any\)\.mockRejectedValue\(new Error\('Twilio error: 502 Bad Gateway'\)\);/,
  ''
);
fmContent = fmContent.replace(
  /const \{ TelephonyService \} = await import\('@\/modules\/communication\/telephony\/telephony\.service'\);\n\s*\(TelephonyService\.sendSms as any\)\.mockRejectedValue\(new Error\('Twilio error: 401 Unauthorized'\)\);/,
  ''
);

fmContent = fmContent.replace(/communication\.sms\.send/g, 'SEND_SMS');
fmContent = fmContent.replace(/body: 'Test'/g, `body: '502'`);
fmContent = fmContent.replace(/jobId: 'job-2'[\s\S]*?body: '502'/, `jobId: 'job-2', tenantId: testTenantId, actorType: 'SYSTEM', correlationId: 'req-2',
      jobType: 'SEND_SMS', payload: { to: '+123', body: '401' }`);

fs.writeFileSync(fmFile, fmContent);

console.log('done');
