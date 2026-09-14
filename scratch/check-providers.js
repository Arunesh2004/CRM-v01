const fs = require('fs');
['.env.preview.real', '.env.staging.real', '.env.production'].forEach(file => {
  try {
    const c = fs.readFileSync(file, 'utf8');
    console.log('--- ' + file + ' ---');
    console.log('Clerk:', c.includes('CLERK_SECRET_KEY=') && !c.includes('CLERK_SECRET_KEY="['));
    console.log('Gemini:', c.includes('GEMINI_API_KEY=') && !c.includes('GEMINI_API_KEY="['));
    console.log('Resend:', c.includes('RESEND_API_KEY=') && !c.includes('RESEND_API_KEY="['));
    console.log('Twilio:', c.includes('TWILIO_ACCOUNT_SID=') && !c.includes('TWILIO_ACCOUNT_SID="['));
    console.log('Pusher:', c.includes('PUSHER_SECRET=') && !c.includes('PUSHER_SECRET="['));
    console.log('MediaMTX:', c.includes('MEDIAMTX_WEBHOOK_SECRET=') && !c.includes('MEDIAMTX_WEBHOOK_SECRET="['));
    console.log('S3:', c.includes('AWS_ACCESS_KEY_ID=') && !c.includes('AWS_ACCESS_KEY_ID="['));
    console.log('Redis:', c.includes('REDIS_URL=') && !c.includes('REDIS_URL="['));
  } catch(e) {}
});
