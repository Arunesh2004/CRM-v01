import { describe, it, expect } from 'vitest';
import { redact } from '@/lib/observability/redact';

describe('S15.2 FND-15-03: Log Redaction', () => {
  it('STRONG: redacts simple sensitive keys', () => {
    const input = { password: 'my-secret-password', name: 'John' };
    const output = redact(input);
    expect(output.password).toBe('[REDACTED]');
    expect(output.name).toBe('John');
  });

  it('STRONG: redacts nested sensitive keys and arrays', () => {
    const input = {
      users: [
        { apiKey: 'sk-1234', role: 'admin' },
        { token: 'tok-567', profile: { Set_Cookie: 'session=abc', bio: 'hello' } }
      ]
    };
    const output = redact(input);
    expect(output.users[0].apiKey).toBe('[REDACTED]');
    expect(output.users[0].role).toBe('admin');
    expect(output.users[1].token).toBe('[REDACTED]');
    expect(output.users[1].profile.Set_Cookie).toBe('[REDACTED]');
    expect(output.users[1].profile.bio).toBe('hello');
  });

  it('STRONG: redacts sensitive patterns in strings (e.g. URLs)', () => {
    const input = {
      url: 'https://example.com/reset?token=secret-token-123&user=john',
      header: 'Bearer super-secret-token'
    };
    const output = redact(input);
    expect(output.url).toBe('https://example.com/reset?token=[REDACTED]&user=john');
    expect(output.header).toBe('Bearer [REDACTED]');
  });

  it('STRONG: redacts HTML fields carefully without destroying all HTML', () => {
    const input = {
      html: '<html><body><a href="https://app.com/verify?token=12345">Verify</a><p>Hello!</p></body></html>',
      otherHtml: '<html><body><p>Just some text</p></body></html>'
    };
    const output = redact(input);
    expect(output.html).toBe('<html><body><a href="https://app.com/verify?token=[REDACTED]">Verify</a><p>Hello!</p></body></html>');
    expect(output.otherHtml).toBe('<html><body><p>Just some text</p></body></html>');
  });
});
