import http from 'http';

const CONCURRENCY_LEVELS = [1, 5, 10, 15];
const ITERATIONS = 20;

async function fetchApi() {
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3000/api/diagnostic');
    return { success: res.ok, status: res.status, latency: Date.now() - start };
  } catch (e: any) {
    return { success: false, status: 500, latency: Date.now() - start, error: e.message };
  }
}

function calculatePercentiles(latencies: number[]) {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (perc: number) => sorted[Math.floor((perc / 100) * (sorted.length - 1))];
  return { p50: p(50), p95: p(95), p99: p(99) };
}

async function workerLoop() {
  const results = [];
  for (let i = 0; i < ITERATIONS; i++) {
    results.push(await fetchApi());
  }
  return results;
}

async function runApiBenchmark() {
  // Check if API is running
  try {
    await fetch('http://localhost:3000/api/diagnostic');
  } catch (e) {
    console.error('API is not running on localhost:3000. API_PERFORMANCE is BLOCKED.');
    process.exit(0);
  }

  for (const concurrency of CONCURRENCY_LEVELS) {
    console.log(`\n--- API Concurrency: ${concurrency} ---`);
    const start = Date.now();
    const workers = [];
    for (let i = 0; i < concurrency; i++) workers.push(workerLoop());
    
    const workerResults = await Promise.all(workers);
    const duration = Date.now() - start;
    const flatResults = workerResults.flat();
    
    const successful = flatResults.filter(r => r.success);
    const failed = flatResults.filter(r => !r.success);
    
    console.log(`Throughput: ${(flatResults.length / (duration / 1000)).toFixed(2)} req/sec`);
    console.log(`Successful (2xx): ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    
    const succP = calculatePercentiles(successful.map(r => r.latency));
    console.log('Success Latencies:', succP);
  }
}

runApiBenchmark().catch(console.error);
