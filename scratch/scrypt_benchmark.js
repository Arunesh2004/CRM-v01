const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

const N = 16384;
const r = 8;
const p = 1;
const keylen = 32;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, keylen, { N, r, p });
  return { salt, derivedKey };
}

async function verifyPassword(password, salt, expectedKey) {
  const derivedKey = await scryptAsync(password, salt, keylen, { N, r, p });
  return crypto.timingSafeEqual(expectedKey, derivedKey);
}

async function runBenchmark(count) {
  const start = performance.now();
  const memoryBefore = process.memoryUsage().heapUsed;
  
  // Create synthetic passwords
  const passwords = Array(count).fill('synthetic_test_password');
  
  const hashes = await Promise.all(passwords.map(p => hashPassword(p)));
  
  const hashEnd = performance.now();
  const hashTime = hashEnd - start;

  const verifications = await Promise.all(hashes.map((h, i) => verifyPassword(passwords[i], h.salt, h.derivedKey)));
  
  const verifyEnd = performance.now();
  const verifyTime = verifyEnd - hashEnd;

  const memoryAfter = process.memoryUsage().heapUsed;
  const memoryDiff = (memoryAfter - memoryBefore) / 1024 / 1024; // MB
  
  const failures = verifications.filter(v => !v).length;
  
  console.log(`Concurrent: ${count}`);
  console.log(`Hash Time: ${hashTime.toFixed(2)}ms (${(hashTime/count).toFixed(2)}ms per hash avg)`);
  console.log(`Verify Time: ${verifyTime.toFixed(2)}ms (${(verifyTime/count).toFixed(2)}ms per verify avg)`);
  console.log(`Peak Memory Delta: ${memoryDiff.toFixed(2)} MB`);
  console.log(`Failures: ${failures}`);
  console.log('---');
}

async function main() {
  console.log('--- Scrypt Benchmark ---');
  await runBenchmark(1);
  await runBenchmark(10);
  await runBenchmark(50);
}

main().catch(console.error);
