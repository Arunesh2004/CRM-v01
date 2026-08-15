export function validateEnvironment(): void {
  // Required foundational infrastructure
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET',
    'COMPANY_TENANT_ID',
    'ADMIN_EMAIL'
  ];

  // We do not strictly enforce billing keys yet in this validation 
  // since they are not activated, but architecturally they will be added here.
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    throw new Error(`CRITICAL STARTUP FAILURE: Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Twilio constraints
  if (isProduction) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WEBHOOK_SECRET) {
      throw new Error(`CRITICAL STARTUP FAILURE: Twilio credentials missing in production`);
    }
  }

  // WhatsApp constraints
  if (isProduction) {
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || !process.env.WHATSAPP_APP_SECRET) {
      throw new Error(`CRITICAL STARTUP FAILURE: WhatsApp credentials missing in production`);
    }
  }



  // Prevent secrets from leaking via NEXT_PUBLIC_
  const allEnvKeys = Object.keys(process.env);
  const leakedSecrets = allEnvKeys.filter(k => 
    k.startsWith('NEXT_PUBLIC_') && 
    (k.includes('SECRET') || k.includes('PASSWORD') || k.includes('DATABASE_URL')) &&
    !k.includes('CLERK') // Clerk's is a publishable key, though it shouldn't have 'SECRET' anyway
  );

  if (leakedSecrets.length > 0) {
    throw new Error(`CRITICAL SECURITY FAILURE: Private secrets exposed to client bundle: ${leakedSecrets.join(', ')}`);
  }

  // Production Safety Checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DATABASE_URL?.includes('localhost')) {
      throw new Error('CRITICAL STARTUP FAILURE: DATABASE_URL cannot point to localhost in production.');
    }
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      throw new Error('CRITICAL STARTUP FAILURE: Debug mode must be disabled in production.');
    }
  }
}

export const ENV = {
  get isProduction() { return process.env.NODE_ENV === 'production'; },
  get databaseUrl() { return process.env.DATABASE_URL!; },
  get redisUrl() { return process.env.REDIS_URL || 'redis://localhost:6379'; },
  get companyTenantId() { return process.env.COMPANY_TENANT_ID!; },
  get adminEmail() { return process.env.ADMIN_EMAIL!; },
  
  // Storage
  get awsAccessKeyId() { return process.env.AWS_ACCESS_KEY_ID; },
  get awsSecretAccessKey() { return process.env.AWS_SECRET_ACCESS_KEY; },
  
};
