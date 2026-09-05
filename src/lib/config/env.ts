export function validateEnvironment(): void {
  // Required foundational infrastructure
  const coreRequiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET',
    'ENCRYPTION_KEY',
  ];

  // Optional CCTV integration variables
  const cctvVars = [
    'CCTV_STREAM_JWT_SECRET',
    'CCTV_OPAQUE_PATH_SECRET',
    'MEDIAMTX_API_URL',
    'MEDIAMTX_WEBHOOK_SECRET',
    'PUBLIC_APP_URL'
  ];

  // Voice Bridge integration variables
  const voiceStreamingEnabled = process.env.VOICE_STREAMING_ENABLED === 'true';
  const voiceBridgeVars = ['VOICE_BRIDGE_URL', 'BRIDGE_JWT_SECRET'];
  const missingVoiceBridgeVars = voiceBridgeVars.filter(v => !process.env[v]);
  
  if (voiceStreamingEnabled && missingVoiceBridgeVars.length > 0) {
    console.error(`CRITICAL SECURITY FAILURE: Voice streaming is enabled but missing required configuration: ${missingVoiceBridgeVars.join(', ')}. Inbound calls will fail closed.`);
  } else if (!voiceStreamingEnabled) {
    console.log(`INFO: Voice streaming is intentionally disabled. Legacy routing will be used.`);
  }

  // We do not strictly enforce billing keys yet in this validation 
  // since they are not activated, but architecturally they will be added here.
  const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
  const missingCore = coreRequiredVars.filter(v => !process.env[v]);
  
  if (missingCore.length > 0) {
    throw new Error(`CRITICAL STARTUP FAILURE: Missing required environment variables: ${missingCore.join(', ')}`);
  }

  const missingCCTV = cctvVars.filter(v => !process.env[v]);
  const presentCCTV = cctvVars.filter(v => !!process.env[v]);

  if (missingCCTV.length > 0 && presentCCTV.length > 0) {
    console.warn(`WARNING: CCTV integration is partially configured. Missing variables: ${missingCCTV.join(', ')}. CCTV features will be disabled.`);
  } else if (missingCCTV.length === cctvVars.length) {
    console.log(`INFO: CCTV integration is not configured. CCTV features will be disabled.`);
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (process.env.COMPANY_TENANT_ID && !uuidRegex.test(process.env.COMPANY_TENANT_ID.trim())) {
    throw new Error(`CRITICAL STARTUP FAILURE: COMPANY_TENANT_ID must be a valid UUID.`);
  }

  // Twilio constraints
  if (isProduction) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
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
  get isProduction() { return process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production'; },
  get databaseUrl() { return process.env.DATABASE_URL!; },
  get redisUrl() { return process.env.REDIS_URL || 'redis://localhost:6379'; },
  get companyTenantId() { return process.env.COMPANY_TENANT_ID?.trim()!; },
  get initialAdminEmails(): string[] { 
    const val = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    if (!val) return [];
    return val.split(',').map(e => e.trim()).filter(e => e.length > 0);
  },
  get initialAdminEmail() { 
    const emails = this.initialAdminEmails;
    return emails.length > 0 ? emails[0] : undefined;
  },
  get demoAccountEmail() {
    return process.env.DEMO_ACCOUNT_EMAIL?.trim().toLowerCase();
  },
  get internalTestEmails(): string[] {
    const val = process.env.INTERNAL_TEST_EMAIL?.trim().toLowerCase();
    if (!val) return [];
    return val.split(',').map(e => e.trim()).filter(e => e.length > 0);
  },
  


  // Storage
  get awsAccessKeyId() { return process.env.AWS_ACCESS_KEY_ID; },
  get awsSecretAccessKey() { return process.env.AWS_SECRET_ACCESS_KEY; },

  // CCTV / MediaMTX
  get cctvEnabled(): boolean {
    const cctvVars = [
      process.env.CCTV_STREAM_JWT_SECRET,
      process.env.CCTV_OPAQUE_PATH_SECRET,
      process.env.MEDIAMTX_API_URL,
      process.env.MEDIAMTX_WEBHOOK_SECRET,
      process.env.PUBLIC_APP_URL
    ];
    return cctvVars.every(v => !!v);
  },
  get cctvStreamJwtSecret() { 
    if (!this.cctvEnabled) throw new Error('CCTV module is disabled: missing required configuration');
    return process.env.CCTV_STREAM_JWT_SECRET!; 
  },
  get cctvOpaquePathSecret() { 
    if (!this.cctvEnabled) throw new Error('CCTV module is disabled: missing required configuration');
    return process.env.CCTV_OPAQUE_PATH_SECRET!; 
  },
  get cctvOpaquePathSecretPrevious() { return process.env.CCTV_OPAQUE_PATH_SECRET_PREVIOUS; },
  get cctvOpaquePathSecretPreviousValidUntil() { 
    return process.env.CCTV_OPAQUE_PATH_SECRET_PREVIOUS_VALID_UNTIL ? 
      new Date(process.env.CCTV_OPAQUE_PATH_SECRET_PREVIOUS_VALID_UNTIL) : undefined;
  },
  get mediamtxApiUrl() { 
    if (!this.cctvEnabled) throw new Error('CCTV module is disabled: missing required configuration');
    return process.env.MEDIAMTX_API_URL!; 
  },
  get publicAppUrl() { 
    if (!this.cctvEnabled) throw new Error('CCTV module is disabled: missing required configuration');
    return process.env.PUBLIC_APP_URL!; 
  },
  get mediamtxWebhookSecret() { 
    if (!this.cctvEnabled) throw new Error('CCTV module is disabled: missing required configuration');
    return process.env.MEDIAMTX_WEBHOOK_SECRET!; 
  },
  get encryptionKey() { return process.env.ENCRYPTION_KEY!; },

  // Voice Bridge
  get voiceStreamingEnabled(): boolean {
    return process.env.VOICE_STREAMING_ENABLED === 'true';
  },
  get voiceBridgeUrl(): string {
    if (!this.voiceStreamingEnabled) throw new Error('Voice Bridge is not enabled');
    return process.env.VOICE_BRIDGE_URL!;
  },
  // Intentionally not exposed as a plain getter to prevent accidental logging.
  // Use BRIDGE_JWT_SECRET directly in signing operations only.
  get bridgeJwtSecretIsConfigured(): boolean {
    return !!process.env.BRIDGE_JWT_SECRET;
  },
};
