import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('G13: Seed Demo HTTP Route Removal', () => {
  it('ensures /api/seed-demo/route.ts does not exist to prevent unauthenticated DB mutations', () => {
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'seed-demo', 'route.ts');
    const exists = fs.existsSync(routePath);
    expect(exists).toBe(false);
  });
});
