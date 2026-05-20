import { IncrementalStreamingTokenizer, IncrementalStreamingValidator } from './run-incremental-stream-fuzz.js';

/**
 * ZTAN Parser Resource Exhaustion & Performance Benchmark
 */

function getHeapUsageBytes(): number {
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage().heapUsed;
}

function runBenchmark() {
  console.log('===========================================================');
  console.log('    ZTAN Parser Resource Exhaustion & Performance Bench    ');
  console.log('===========================================================');

  // --- BENCHMARK 1: Deep Nesting Churn ---
  console.log('\n[1/4] Executing Deep Nesting Churn Benchmark...');
  // Construct an array nested exactly to the safety ceiling of 64 levels
  const deepNestedJson = '['.repeat(64) + '1' + ']'.repeat(64);
  const nestingIterations = 5000;
  
  const nestingStartHeap = getHeapUsageBytes();
  const nestingStartTime = performance.now();
  
  for (let i = 0; i < nestingIterations; i++) {
    const tokenizer = new IncrementalStreamingTokenizer();
    const validator = new IncrementalStreamingValidator();
    const tokens = tokenizer.write(deepNestedJson);
    validator.processTokens(tokens);
    const finalTokens = tokenizer.end();
    validator.processTokens(finalTokens);
    validator.finalize();
  }
  
  const nestingEndTime = performance.now();
  const nestingEndHeap = getHeapUsageBytes();
  
  const nestingDuration = nestingEndTime - nestingStartTime;
  const nestingAllocations = Math.max(0, nestingEndHeap - nestingStartHeap);
  console.log(`  - Executions: ${nestingIterations}`);
  console.log(`  - Total Wall-Clock Latency: ${nestingDuration.toFixed(2)} ms`);
  console.log(`  - Mean Execution Latency: ${(nestingDuration / nestingIterations).toFixed(3)} ms`);
  console.log(`  - Net Heap Delta: ${(nestingAllocations / 1024).toFixed(2)} KB`);

  // --- BENCHMARK 2: Dense Escapes & Max String Ceilings ---
  console.log('\n[2/4] Executing Dense Escapes & Max String Ceiling Benchmark...');
  // A string at the safety limit (64KB) populated with dense escape sequences
  const denseEscapesString = '"' + '\\"\\n\\t\\\\'.repeat(7500) + '"';
  const escapesIterations = 100;
  
  const escapesStartHeap = getHeapUsageBytes();
  const escapesStartTime = performance.now();
  
  for (let i = 0; i < escapesIterations; i++) {
    const tokenizer = new IncrementalStreamingTokenizer();
    const validator = new IncrementalStreamingValidator();
    const tokens = tokenizer.write(denseEscapesString);
    validator.processTokens(tokens);
    const finalTokens = tokenizer.end();
    validator.processTokens(finalTokens);
    validator.finalize();
  }
  
  const escapesEndTime = performance.now();
  const escapesEndHeap = getHeapUsageBytes();
  
  const escapesDuration = escapesEndTime - escapesStartTime;
  const escapesAllocations = Math.max(0, escapesEndHeap - escapesStartHeap);
  console.log(`  - Payload Size: ${(denseEscapesString.length / 1024).toFixed(2)} KB`);
  console.log(`  - Executions: ${escapesIterations}`);
  console.log(`  - Total Wall-Clock Latency: ${escapesDuration.toFixed(2)} ms`);
  console.log(`  - Mean Execution Latency: ${(escapesDuration / escapesIterations).toFixed(3)} ms`);
  console.log(`  - Net Heap Delta: ${(escapesAllocations / 1024).toFixed(2)} KB`);

  // --- BENCHMARK 3: Limit Key-Space Churn ---
  console.log('\n[3/4] Executing Limit Key-Space Churn Benchmark...');
  // Construct an object containing exactly the 10,000 unique keys limit
  const keysArray: string[] = [];
  for (let i = 0; i < 10000; i++) {
    keysArray.push(`"k${i}":${i}`);
  }
  const maxKeysJson = '{' + keysArray.join(',') + '}';
  const keysIterations = 50;
  
  const keysStartHeap = getHeapUsageBytes();
  const keysStartTime = performance.now();
  
  for (let i = 0; i < keysIterations; i++) {
    const tokenizer = new IncrementalStreamingTokenizer();
    const validator = new IncrementalStreamingValidator();
    const tokens = tokenizer.write(maxKeysJson);
    validator.processTokens(tokens);
    const finalTokens = tokenizer.end();
    validator.processTokens(finalTokens);
    validator.finalize();
  }
  
  const keysEndTime = performance.now();
  const keysEndHeap = getHeapUsageBytes();
  
  const keysDuration = keysEndTime - keysStartTime;
  const keysAllocations = Math.max(0, keysEndHeap - keysStartHeap);
  console.log(`  - Unique Keys: 10,000`);
  console.log(`  - Payload Size: ${(maxKeysJson.length / 1024).toFixed(2)} KB`);
  console.log(`  - Executions: ${keysIterations}`);
  console.log(`  - Total Wall-Clock Latency: ${keysDuration.toFixed(2)} ms`);
  console.log(`  - Mean Execution Latency: ${(keysDuration / keysIterations).toFixed(3)} ms`);
  console.log(`  - Net Heap Delta: ${(keysAllocations / 1024).toFixed(2)} KB`);

  // --- BENCHMARK 4: Streaming Fragmentation Throughput ---
  console.log('\n[4/4] Executing Physical Stream Fragmentation Throughput Benchmark...');
  // Feed a large JSON payload (250KB) sliced byte-by-byte (1-byte chunk) into the tokenizer
  const throughputArray: string[] = [];
  for (let i = 0; i < 5000; i++) {
    throughputArray.push(`"key_${i}":{"val":${i},"ok":true}`);
  }
  const largeJsonPayload = '{' + throughputArray.join(',') + '}';
  
  const fragStartHeap = getHeapUsageBytes();
  const fragStartTime = performance.now();
  
  const tokenizer = new IncrementalStreamingTokenizer();
  const validator = new IncrementalStreamingValidator();
  
  // Write byte-by-byte
  for (let i = 0; i < largeJsonPayload.length; i++) {
    const chunk = largeJsonPayload[i];
    const tokens = tokenizer.write(chunk);
    validator.processTokens(tokens);
  }
  
  const finalTokens = tokenizer.end();
  validator.processTokens(finalTokens);
  validator.finalize();
  
  const fragEndTime = performance.now();
  const fragEndHeap = getHeapUsageBytes();
  
  const fragDuration = fragEndTime - fragStartTime;
  const fragAllocations = Math.max(0, fragEndHeap - fragStartHeap);
  const throughputMbps = (largeJsonPayload.length / (1024 * 1024)) / (fragDuration / 1000);
  
  console.log(`  - Payload Size: ${(largeJsonPayload.length / 1024).toFixed(2)} KB`);
  console.log(`  - Fragmentation Slices: ${largeJsonPayload.length} single-byte chunks`);
  console.log(`  - Total State Transitions: ${largeJsonPayload.length} steps`);
  console.log(`  - Execution Latency: ${fragDuration.toFixed(2)} ms`);
  console.log(`  - Tokenizer Throughput: ${throughputMbps.toFixed(3)} MB/s`);
  console.log(`  - Net Heap Delta: ${(fragAllocations / 1024).toFixed(2)} KB`);
  
  console.log('\n===========================================================');
  console.log('    Resource Pressure Benchmarking Execution Completed     ');
  console.log('===========================================================');
}

runBenchmark();
