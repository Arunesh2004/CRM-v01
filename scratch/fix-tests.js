const fs = require('fs');
const crypto = require('crypto');

let corrFile = 'src/tests/observability/correlation.test.ts';
let corrContent = fs.readFileSync(corrFile, 'utf8');

corrContent = corrContent.replace(
  `it('O2: Ignores user-spoofed correlationId if not stamped by backend', async () => {
    await withTenant(testTenantId).eventOutbox.create({
      data: {
        eventId: 'spoofed-event-1',`,
  `it('O2: Ignores user-spoofed correlationId if not stamped by backend', async () => {
    const event = await withTenant(testTenantId).eventOutbox.create({
      data: {
        eventId: 'spoofed-event-1',`
);

corrContent = corrContent.replace(
  `correlationId: 'spoofed-event-1'
        })`,
  `correlationId: event.id
        })`
);

fs.writeFileSync(corrFile, corrContent);

let fmFile = 'src/tests/observability/failure-modes.test.ts';
let fmContent = fs.readFileSync(fmFile, 'utf8');

fmContent = fmContent.replace(
  `let testTenantId = 'tenant-1';`,
  `let testTenantId = '${crypto.randomUUID()}';`
);

fs.writeFileSync(fmFile, fmContent);

console.log('done');
