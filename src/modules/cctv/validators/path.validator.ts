import path from 'path';
import fs from 'fs/promises';

/**
 * Ensures that a target path securely resolves inside the given root directory.
 * Defends against symlink traversal, naïve prefix matching, and path normalization attacks.
 * 
 * @param targetPath The untrusted path to validate
 * @param expectedRoot The authoritative trusted root boundary
 * @returns The fully resolved, canonical absolute path if valid
 * @throws Error if the path resolves outside the root or doesn't exist
 */
export async function assertPathInRoot(targetPath: string, expectedRoot: string): Promise<string> {
  if (!targetPath || !expectedRoot) {
    throw new Error('Path validation requires both target and root');
  }

  // 1. Resolve the canonical root (handles symlinks on the root itself)
  let canonicalRoot: string;
  try {
    canonicalRoot = await fs.realpath(expectedRoot);
  } catch (err) {
    throw new Error(`Trusted root cannot be resolved: ${(err as Error).message}`);
  }

  // 2. Resolve the canonical target (handles symlinks traversing outside)
  let canonicalTarget: string;
  try {
    canonicalTarget = await fs.realpath(targetPath);
  } catch (err) {
    throw new Error(`Target path cannot be resolved: ${(err as Error).message}`);
  }

  // 3. Ensure the root ends with a separator to prevent prefix collision
  // (e.g. /var/lib/recordings vs /var/lib/recordings-evil)
  const rootWithSep = canonicalRoot.endsWith(path.sep) 
    ? canonicalRoot 
    : canonicalRoot + path.sep;

  // 4. Validate containment
  if (canonicalTarget !== canonicalRoot && !canonicalTarget.startsWith(rootWithSep)) {
    throw new Error('Security violation: Path resolves outside trusted root');
  }

  return canonicalTarget;
}
