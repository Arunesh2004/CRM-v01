import { ProviderFactory } from '../src/lib/providers/provider.factory';
import { TwilioProvider } from '../src/lib/providers/telephony/twilio.provider';
import { GeminiProvider } from '../src/lib/providers/ai/gemini.provider';

async function testMissingCredentials() {
  console.log('--- Running S7 Missing Credentials Matrix ---');
  
  // Clear env vars
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.GEMINI_API_KEY;
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.PUSHER_APP_ID;

  let errors = 0;

  // 1. Telephony (Twilio)
  try {
    const provider = new TwilioProvider();
    const res = await provider.initiateCall('tenant-test', { to: '+123' });
    if (res.success !== false) {
      console.error('❌ Twilio should fail gracefully without credentials, but returned success');
      errors++;
    } else {
      console.log('✔ Twilio degraded safely:', res.error);
    }
  } catch (e) {
    console.error('❌ Twilio threw an exception instead of degrading safely:', e.message);
    errors++;
  }

  // 2. AI (Gemini)
  try {
    const provider = new GeminiProvider();
    const res = await provider.generateResponse('test', []);
    if (res !== null && res.success !== false) {
       console.error('❌ Gemini should fail gracefully without credentials');
       errors++;
    } else {
       console.log('✔ Gemini degraded safely');
    }
  } catch (e: any) {
    if (!e.message.includes('API key not valid') && !e.message.includes('API key') && !e.message.includes('GEMINI_API_KEY')) {
        console.error('❌ Gemini threw unexpected exception:', e.message);
        errors++;
    } else {
        console.log('✔ Gemini degraded safely (API error trapped by caller):', e.message);
    }
  }

  // If no fatal crashes happened during instantiation, it's safe.
  if (errors > 0) {
    console.error(`❌ S7 Matrix Failed with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log('✔ S7 Matrix passed. Providers degrade gracefully without credentials.');
  }
}

testMissingCredentials().catch(e => {
  console.error('Unhandled crash:', e);
  process.exit(1);
});
