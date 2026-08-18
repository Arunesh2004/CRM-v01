import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
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
      '@': path.resolve(__dirname, './src')
    }
  }
});
