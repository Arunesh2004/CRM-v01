import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Default global mock values for CCTV configuration to ensure legacy tests evaluating
// the 'CCTV ENABLED' mode continue to pass. The startup-decoupling test intentionally
// clears these to verify the disabled state.
process.env.CCTV_STREAM_JWT_SECRET = process.env.CCTV_STREAM_JWT_SECRET || 'jwt_secret';
process.env.CCTV_OPAQUE_PATH_SECRET = process.env.CCTV_OPAQUE_PATH_SECRET || 'opaque_secret';
process.env.MEDIAMTX_API_URL = process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997';
process.env.MEDIAMTX_WEBHOOK_SECRET = process.env.MEDIAMTX_WEBHOOK_SECRET || 'super_secret';
process.env.PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/tests/**/*.test.{ts,tsx}', 'tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true
      },
      forks: {
        singleFork: true
      }
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@db': path.resolve(__dirname, './database')
    }
  }
});
