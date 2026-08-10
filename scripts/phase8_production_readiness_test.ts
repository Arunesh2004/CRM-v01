import { env } from '../src/lib/env';
import { CustomerSchema, validatePayload } from '../src/lib/security/validations';
import { rateLimiter } from '../src/lib/security/rate-limit';

async function runProductionTests() {
  console.log('Starting Phase 8 Production Readiness Tests...\n');

  try {
    // 1. Environment Test
    console.log('[1/4] Testing Environment Boundaries');
    if (!env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
    if (!env.CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY');
    console.log('✅ Environment Validated (Zod Passed)');

    // 2. Security Test (Input Validation)
    console.log('\n[2/4] Testing Zod Input Validation');
    const invalidPayload = { name: "A", email: "not-an-email" }; // Name too short, invalid email
    const result = validatePayload(CustomerSchema, invalidPayload);
    
    if (result.success) {
      throw new Error('❌ Security Failure: Zod allowed an invalid payload through.');
    } else {
      console.log(`✅ Invalid Payload Rejected Successfully: ${result.error}`);
    }

    // 3. Security Test (Rate Limiting)
    console.log('\n[3/4] Testing Rate Limiter');
    const testIp = '192.168.1.1';
    let blocked = false;
    for (let i = 0; i < 12; i++) {
      const allowed = await rateLimiter.check(testIp, 10, 60000);
      if (!allowed) blocked = true;
    }
    
    if (blocked) {
      console.log('✅ Rate Limiter Successfully Blocked Brute Force Attempt (12 reqs / 10 limit)');
    } else {
      throw new Error('❌ Rate Limiter failed to block requests.');
    }

    // 4. Observability Test
    console.log('\n[4/4] Testing Observability Engine');
    const { logger } = require('../src/lib/observability/logger');
    logger.info('Simulated production event', { tenantId: 'test-123' });
    console.log('✅ Structured JSON Logger fired successfully');

    console.log('\n🚀 ALL PRODUCTION TESTS PASSED');
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runProductionTests();
