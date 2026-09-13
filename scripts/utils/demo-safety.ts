import { URL } from 'url';

export function enforceDemoSafetyGuard() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const vercelEnv = process.env.VERCEL_ENV || 'unknown';
  
  if (nodeEnv === 'production' || vercelEnv === 'production') {
    console.error("FATAL: Cannot run demo scripts in a Production environment.");
    process.exit(1);
  }

  const dbUrlStr = process.env.DATABASE_URL;
  if (!dbUrlStr) {
    console.error("FATAL: DATABASE_URL is not set. Refusing to run demo scripts in ambiguous environment.");
    process.exit(1);
  }

  try {
    const dbUrl = new URL(dbUrlStr);
    const host = dbUrl.hostname.toLowerCase();

    const safeHosts = ['localhost', '127.0.0.1', 'postgres', 'db', 'host.docker.internal'];
    const knownProdHosts = ['supabase.co', 'supabase.com', 'neon.tech', 'amazonaws.com', 'rds'];

    if (knownProdHosts.some(prod => host.includes(prod))) {
      console.error(`FATAL: DATABASE_URL contains known production host '${host}'. Refusing to run.`);
      process.exit(1);
    }

    if (!safeHosts.includes(host)) {
      console.error(`FATAL: DATABASE_URL host '${host}' is ambiguous or not explicitly approved for demo seeding. Refusing to run.`);
      process.exit(1);
    }

  } catch {
    console.error("FATAL: Could not parse DATABASE_URL. Refusing to run.");
    process.exit(1);
  }
}
