import * as argon2 from 'argon2';

/**
 * Hash a password using Argon2id with memory-hard settings suitable for our environment.
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64MB memory per hash
    timeCost: 3,       // 3 iterations
    parallelism: 4,    // 4 threads
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // Treat malformed hashes or other errors as a failed verification
    return false;
  }
}

// A pre-computed dummy Argon2id hash for timing-attack mitigation.
// This represents the hash of a securely generated, unknown random password.
// DO NOT use this for any real user.
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzdHJpbmc$G+E3/X4n0b2sR+D3M8N/H0fF2Q6vQ6g5A8Z8E2tQ0pQ';

/**
 * Performs a dummy password verification to mitigate user-enumeration timing attacks.
 * This ensures that login attempts for non-existent users take a comparable amount 
 * of time to login attempts for real users.
 */
export async function verifyDummyPassword(password: string): Promise<boolean> {
  try {
    // We verify against the constant dummy hash. This will predictably take
    // approximately the same time as a real Argon2id verify call.
    // It will essentially always return false (unless the user guesses the dummy password,
    // which is random and not associated with any account anyway).
    await argon2.verify(DUMMY_HASH, password);
    return false;
  } catch (error) {
    return false;
  }
}
