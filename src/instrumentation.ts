import { validateEnvironment } from '@/lib/config/env';

export function register() {
  validateEnvironment();
}
