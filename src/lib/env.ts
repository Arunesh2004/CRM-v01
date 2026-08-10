import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Clerk Auth
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),

  // Disaster Recovery / Infrastructure Features
  DR_ENABLED: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),

  // Optional: AWS S3 / R2
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Optional: AWS KMS
  KMS_KEY_ID: z.string().optional(),

  // Optional: Redis
  REDIS_URL: z.string().url().optional(),

  // Standard NextJS environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    "❌ Invalid environment variables:\n",
    ..._env.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}\n`)
  );
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
