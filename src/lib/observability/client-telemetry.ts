import { z } from 'zod';

export const ClientTelemetryErrorSchema = z.object({
  name: z.string().max(100),
  message: z.string().max(500),
  digest: z.string().max(64).optional(),
  stack: z.string().max(2000).optional(),
  url: z.string().max(500),
}).strict();

export type ClientTelemetryError = z.infer<typeof ClientTelemetryErrorSchema>;

/**
 * Normalizes a URL by stripping query strings and fragments.
 * Ensures the string doesn't exceed the length limit.
 */
export function normalizeTelemetryUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    // Strip query and hash
    parsed.search = '';
    parsed.hash = '';
    const safeUrl = parsed.toString();
    return safeUrl.substring(0, 500);
  } catch {
    // If it's not a valid URL (e.g. just a pathname or malformed),
    // strip standard delimiters manually as best-effort.
    const pathOnly = rawUrl.split('?')[0].split('#')[0];
    return pathOnly.substring(0, 500);
  }
}
