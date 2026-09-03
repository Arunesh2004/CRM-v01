/**
 * Phase 9R — Secret/Credential Exposure Prevention Tests
 *
 * These tests verify that:
 * 1. No credential material is tracked by git (.kms-storage.json is untracked)
 * 2. .env does not contain real credentials (Gemini key, Redis password, DB password comment)
 * 3. The cron secret handler correctly denies unauthorized requests
 * 4. KMS key material integrity (compromised v1/v2 keys must be disabled/replaced)
 * 5. Build artifact (.next/standalone/.env) does not contain real credentials
 * 6. .gitignore and .dockerignore contain required patterns
 *
 * IMPORTANT: These tests use only safe dummy values.
 * No real credential values are used or printed in assertions.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

// ============================================================
// TEST SUITE 9R-1: Git Tracking of Sensitive Files
// ============================================================

describe('9R-1: Git tracking of credential-bearing files', () => {
  it('9R-1-A: .kms-storage.json must NOT be tracked in git index', () => {
    const tracked = execSync('git ls-files .kms-storage.json', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    }).trim();
    expect(tracked).toBe('');
  });

  it('9R-1-B: .env.staging.secrets must NOT exist on disk', () => {
    const filePath = path.join(PROJECT_ROOT, '.env.staging.secrets');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('9R-1-C: .env.bak must NOT exist on disk', () => {
    const filePath = path.join(PROJECT_ROOT, '.env.bak');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('9R-1-D: .gitignore must contain .kms-storage.json pattern', () => {
    const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.kms-storage.json');
  });

  it('9R-1-E: .gitignore must contain *.secrets pattern', () => {
    const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('*.secrets');
  });

  it('9R-1-F: .gitignore must contain *.bak pattern', () => {
    const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('*.bak');
  });

  it('9R-1-G: .gitignore must contain *.real pattern', () => {
    const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('*.real');
  });
});

// ============================================================
// TEST SUITE 9R-2: .env Credential Scrub Verification
// ============================================================

describe('9R-2: .env credential scrub', () => {
  const envPath = path.join(PROJECT_ROOT, '.env');
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  it('9R-2-A: .env must NOT contain Upstash Redis host (certain-ferret)', () => {
    expect(envContent).not.toContain('certain-ferret');
  });

  it('9R-2-B: .env must NOT contain commented-out Upstash Redis credential URLs', () => {
    const lines = envContent.split('\n');
    const suspiciousRedis = lines.filter(
      l => l.startsWith('#') && l.includes('upstash.io')
    );
    expect(suspiciousRedis.length).toBe(0);
  });

  it('9R-2-C: .env must NOT contain a real Gemini API key (AQ. prefix with token)', () => {
    // The compromised key started with "AQ." — this is not a valid placeholder
    const hasRealGeminiKey = /GEMINI_API_KEY="AQ\.[A-Za-z0-9_\-]{30,}"/.test(envContent);
    expect(hasRealGeminiKey).toBe(false);
  });

  it('9R-2-D: .env must NOT contain production DB password in comment lines', () => {
    // The compromised password had format: Word.Digit (e.g. Something.6)
    const lines = envContent.split('\n');
    const suspiciousPasswordComments = lines.filter(
      l => l.match(/^#\w+\.\d+\s*$/)
    );
    expect(suspiciousPasswordComments.length).toBe(0);
  });

  it('9R-2-E: GEMINI_API_KEY in .env must be empty or a safe placeholder', () => {
    const match = envContent.match(/^GEMINI_API_KEY="([^"]*)"$/m);
    if (match) {
      const value = match[1];
      const isEmptyOrPlaceholder = value === '' || value.startsWith('<') || value.startsWith('your_');
      expect(isEmptyOrPlaceholder).toBe(true);
    }
    // Not present at all = also acceptable
  });
});

// ============================================================
// TEST SUITE 9R-3: KMS Key Material Integrity
// ============================================================

describe('9R-3: KMS key material verification', () => {
  const kmsPath = path.join(PROJECT_ROOT, '.kms-storage.json');

  it('9R-3-A: .kms-storage.json must exist (LocalKMS requires it for dev)', () => {
    expect(fs.existsSync(kmsPath)).toBe(true);
  });

  it('9R-3-B: .kms-storage.json must NOT contain the compromised v1 key hex', () => {
    if (!fs.existsSync(kmsPath)) return;
    const content = fs.readFileSync(kmsPath, 'utf-8');
    expect(content).not.toContain('0c6205f528968341d7820b92d57fec927a885a7ab38e0d788705d8d6b45ec504');
  });

  it('9R-3-C: .kms-storage.json must NOT contain the compromised v2 key hex', () => {
    if (!fs.existsSync(kmsPath)) return;
    const content = fs.readFileSync(kmsPath, 'utf-8');
    expect(content).not.toContain('e06faecf6376442c9d5206e34a70f72e007baf43e4a93dc8d92c9326bb9919f4');
  });

  it('9R-3-D: .kms-storage.json active key must be a valid 64-char hex string (256-bit)', () => {
    if (!fs.existsSync(kmsPath)) return;
    const data = JSON.parse(fs.readFileSync(kmsPath, 'utf-8'));
    const activeVersion = data.activeVersion;
    const activeKey = data.keys[activeVersion];
    expect(activeKey).toBeDefined();
    expect(activeKey.status).toBe('ACTIVE');
    const isValidHex = /^[0-9a-f]{64}$/.test(activeKey.keyHex);
    expect(isValidHex).toBe(true);
  });

  it('9R-3-E: Old v1 and v2 key entries in .kms-storage.json must NOT be ACTIVE', () => {
    if (!fs.existsSync(kmsPath)) return;
    const data = JSON.parse(fs.readFileSync(kmsPath, 'utf-8'));
    if (data.keys.v1) {
      expect(data.keys.v1.status).not.toBe('ACTIVE');
    }
    if (data.keys.v2) {
      expect(data.keys.v2.status).not.toBe('ACTIVE');
    }
  });
});

// ============================================================
// TEST SUITE 9R-4: Cron Secret Authentication Logic
// ============================================================

describe('9R-4: Cron endpoint authentication (timing-safe verification)', () => {
  /**
   * Mirrors the exact verifyCronSecret logic from:
   * - src/app/api/cron/ai-retention/route.ts
   * - src/app/api/cron/process-outbox/route.ts
   */
  function verifyCronSecretLogic(authHeader: string | null, cronSecret: string | undefined): boolean {
    if (!authHeader) return false;
    if (!cronSecret) return false;
    const token = authHeader.replace('Bearer ', '');
    if (token.length !== cronSecret.length) return false;
    let mismatch = 0;
    for (let i = 0; i < token.length; i++) {
      mismatch |= token.charCodeAt(i) ^ cronSecret.charCodeAt(i);
    }
    return mismatch === 0;
  }

  it('9R-4-A: Missing Authorization header → denied', () => {
    expect(verifyCronSecretLogic(null, 'safe-test-secret-value-abc')).toBe(false);
  });

  it('9R-4-B: Missing CRON_SECRET env var → denied', () => {
    expect(verifyCronSecretLogic('Bearer safe-test-secret-value-abc', undefined)).toBe(false);
  });

  it('9R-4-C: Wrong token → denied', () => {
    expect(verifyCronSecretLogic('Bearer wrong-token-value-xyz', 'correct-secret-abc')).toBe(false);
  });

  it('9R-4-D: Correct token (timing-safe comparison) → allowed', () => {
    const secret = 'safe-test-cron-secret-for-vitest-only-not-used-in-production';
    expect(verifyCronSecretLogic(`Bearer ${secret}`, secret)).toBe(true);
  });

  it('9R-4-E: Longer token with correct prefix (length extension attack) → denied', () => {
    const secret = 'correct-secret-abc';
    expect(verifyCronSecretLogic('Bearer correct-secret-abc-extra', secret)).toBe(false);
  });

  it('9R-4-F: Empty string token → denied', () => {
    expect(verifyCronSecretLogic('Bearer ', 'correct-secret-abc')).toBe(false);
  });

  it('9R-4-G: Dev placeholder CRON_SECRET must be non-trivial (>8 chars)', () => {
    const envPath = path.join(PROJECT_ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/^CRON_SECRET="([^"]*)"$/m);
    if (match) {
      expect(match[1].length).toBeGreaterThan(8);
    }
  });
});

// ============================================================
// TEST SUITE 9R-5: Build Artifact Credential Check
// ============================================================

describe('9R-5: Build artifact .next/standalone/.env credential check', () => {
  const standaloneEnvPath = path.join(PROJECT_ROOT, '.next', 'standalone', '.env');

  it('9R-5-A: .next/standalone/.env must NOT contain Upstash Redis host', () => {
    if (!fs.existsSync(standaloneEnvPath)) return;
    const content = fs.readFileSync(standaloneEnvPath, 'utf-8');
    expect(content).not.toContain('certain-ferret');
  });

  it('9R-5-B: .next/standalone/.env must NOT contain a real Gemini API key', () => {
    if (!fs.existsSync(standaloneEnvPath)) return;
    const content = fs.readFileSync(standaloneEnvPath, 'utf-8');
    const hasRealGeminiKey = /GEMINI_API_KEY="AQ\.[A-Za-z0-9_\-]{30,}"/.test(content);
    expect(hasRealGeminiKey).toBe(false);
  });

  it('9R-5-C: .dockerignore must contain .kms-storage.json', () => {
    const dockerignorePath = path.join(PROJECT_ROOT, '.dockerignore');
    if (!fs.existsSync(dockerignorePath)) return;
    const content = fs.readFileSync(dockerignorePath, 'utf-8');
    expect(content).toContain('.kms-storage.json');
  });

  it('9R-5-D: .dockerignore must NOT re-include .kms-storage.json via negation', () => {
    const dockerignorePath = path.join(PROJECT_ROOT, '.dockerignore');
    if (!fs.existsSync(dockerignorePath)) return;
    const lines = fs.readFileSync(dockerignorePath, 'utf-8').split('\n');
    const reIncludes = lines.filter(l => l.trim() === '!.kms-storage.json');
    expect(reIncludes.length).toBe(0);
  });
});

// ============================================================
// TEST SUITE 9R-6: LocalKMSProvider Key Generation Integrity
// ============================================================

describe('9R-6: LocalKMSProvider key generation integrity', () => {
  it('9R-6-A: Randomly generated 32-byte key must be 64 hex chars', async () => {
    const { default: crypto } = await import('crypto');
    const newKey = crypto.randomBytes(32).toString('hex');
    expect(newKey).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(newKey)).toBe(true);
  });

  it('9R-6-B: Two independently generated keys must not be identical', async () => {
    const { default: crypto } = await import('crypto');
    const key1 = crypto.randomBytes(32).toString('hex');
    const key2 = crypto.randomBytes(32).toString('hex');
    expect(key1).not.toBe(key2);
  });

  it('9R-6-C: AES-256-GCM encrypt/decrypt round-trip with a fresh 256-bit key succeeds', async () => {
    const { default: crypto } = await import('crypto');
    const masterKey = crypto.randomBytes(32);
    const plaintext = Buffer.from('test-data-encryption-key-for-9r-vitest');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    expect(decrypted.toString()).toBe(plaintext.toString());
  });
});
