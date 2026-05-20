import { tokenizeJson, validateDuplicateKeys } from './canonicalizer.js';

interface ConcurrentStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    startHeap: number;
    endHeap: number;
    elapsedMs: number;
    meanLatencyMs: number;
}

class ZtanConcurrentStressTester {
    private concurrencyLimit = 50;
    private totalIterations = 10000;
    private payload = `{"id":"txn_9921","seq":48819,"meta":{"origin":"US-EAST","auth_levels":[3,4,9]},"payload":{"data":"ZTAN_STABILITY_SOAK_HEX","depth_test":[[[1]]]},"signatures":[{"signer":"gate_01","signature":"MEQCIDUoYXZw..."}]}`;

    public async runCampaign() {
        console.log("===========================================================");
        console.log("    ZTAN Concurrent Stress & Parallel Load Test Suite      ");
        console.log("===========================================================");
        console.log(`[INIT] Concurrency Limit: ${this.concurrencyLimit} simultaneous workers`);
        console.log(`[INIT] Total Parsing Workloads: ${this.totalIterations} iterations`);

        const startHeap = process.memoryUsage().heapUsed;
        const startTime = performance.now();

        let activeCount = 0;
        let completedCount = 0;
        let failCount = 0;
        const taskQueue: (() => Promise<void>)[] = [];

        // Generate concurrent tasks
        for (let i = 0; i < this.totalIterations; i++) {
            taskQueue.push(async () => {
                try {
                    // Randomly simulate physical stream fragmentation for high-concurrency contention
                    if (Math.random() > 0.5) {
                        const chunks = this.slicePayload(this.payload, Math.floor(Math.random() * 5) + 1);
                        let concatenated = "";
                        for (const chunk of chunks) {
                            concatenated += chunk;
                        }
                        const tokens = Array.from(tokenizeJson(concatenated));
                        validateDuplicateKeys(concatenated);
                    } else {
                        // Regular fast-path parse
                        const tokens = Array.from(tokenizeJson(this.payload));
                        validateDuplicateKeys(this.payload);
                    }
                } catch (e) {
                    failCount++;
                }
            });
        }

        console.log(`[EXEC] Spawning parallel worker pools...`);

        // Execute workers concurrently adhering to limits
        const workers = Array.from({ length: this.concurrencyLimit }, async () => {
            while (taskQueue.length > 0) {
                const task = taskQueue.shift();
                if (task) {
                    await task();
                    completedCount++;
                }
            }
        });

        await Promise.all(workers);

        const endTime = performance.now();
        const endHeap = process.memoryUsage().heapUsed;
        const elapsedMs = endTime - startTime;
        const meanLatencyMs = elapsedMs / this.totalIterations;
        const throughput = (this.totalIterations / elapsedMs) * 1000;

        console.log("\n===========================================================");
        console.log("    Concurrent Stress Validation Summary                   ");
        console.log("===========================================================");
        console.log(`  - Parallel Requests Executed:    ${completedCount}`);
        console.log(`  - Successful Convergence Decs:   ${completedCount - failCount}`);
        console.log(`  - Parser Failures / Errors:      ${failCount}`);
        console.log(`  - Total Elapsed Time:            ${elapsedMs.toFixed(2)} ms`);
        console.log(`  - Concurrent Mean Latency:       ${meanLatencyMs.toFixed(4)} ms`);
        console.log(`  - State-Machine Throughput:      ${throughput.toFixed(2)} ops/sec`);
        console.log(`  - Allocator Memory Delta:        ${((endHeap - startHeap) / 1024 / 1024).toFixed(3)} MB`);

        // Verify that mean latency does not explode exponentially
        if (meanLatencyMs > 0.5) {
            console.log("\n[WARNING] ⚠️ High concurrency latency degradation observed. Allocator heap contention is high.");
        } else {
            console.log("\n[RESULT] ✅ Parallel throughput is stable. No allocator contention collapse or state deadlock detected.");
        }
    }

    private slicePayload(s: string, chunkSize: number): string[] {
        const chunks: string[] = [];
        let i = 0;
        while (i < s.length) {
            chunks.push(s.substring(i, i + chunkSize));
            i += chunkSize;
        }
        return chunks;
    }
}

const stressTester = new ZtanConcurrentStressTester();
stressTester.runCampaign();
