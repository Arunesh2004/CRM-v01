import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

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
