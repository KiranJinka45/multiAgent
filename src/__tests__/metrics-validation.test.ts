import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../agents/orchestrator';
import { registry } from '../lib/metrics';
import redis from '../lib/redis';
import { v4 as uuidv4 } from 'uuid';

describe('Prometheus Metrics Validation', () => {

    beforeAll(async () => {
        if (redis.status !== 'ready') {
            await new Promise(resolve => redis.on('ready', resolve));
        }
    });

    afterAll(async () => {
        await redis.quit();
    });

    beforeEach(async () => {
        vi.clearAllMocks();
        registry.clear(); // Reset Prometheus metrics before each test
    });

    it('should correctly increment counters and populate histograms for 10 successful and 5 failed runs', async () => {
        const orchestrator = new Orchestrator();

        // 1. Mock Agents to be super fast
        vi.spyOn(orchestrator['dbAgent'], 'execute').mockResolvedValue({ success: true, data: { schema: 'schema' } });
        vi.spyOn(orchestrator['valAgent'], 'execute').mockResolvedValue({ success: true, data: { confidenceScore: 0.95 } });

        let runCount = 0;
        vi.spyOn(orchestrator['beAgent'], 'execute').mockImplementation(async () => {
            runCount++;
            // The first 5 runs will fail
            if (runCount <= 5) {
                throw new Error('SIMULATED_METRIC_FAILURE : Backend crashed');
            }
            return { success: true, data: { files: [] } };
        });

        vi.spyOn(orchestrator['feAgent'], 'execute').mockResolvedValue({ success: true, data: { files: [] } });
        vi.spyOn(orchestrator['dpAgent'], 'execute').mockResolvedValue({ success: true, data: { files: [] } });
        vi.spyOn(orchestrator['teAgent'], 'execute').mockResolvedValue({ success: true, data: { files: [] } });

        // 2. Execute 15 absolute runs (5 failed due to Backend, 10 successful after Backend stops throwing)
        const runs = [];
        for (let i = 0; i < 15; i++) {
            runs.push(orchestrator.run(`Run ${i}`, 'user1', 'proj1', uuidv4()));
        }

        const runResults = await Promise.all(runs);

        const successes = runResults.filter(r => r.success).length;
        const failures = runResults.filter(r => !r.success).length;

        expect(successes).toBe(10);
        expect(failures).toBe(5);

        // 3. Extract Metrics
        const metricsOutput = await registry.metrics();

        // Output expected metric snapshot for the user visually
        console.log('--- PROMETHEUS METRICS SNAPSHOT ---');
        console.log(metricsOutput);
        console.log('-----------------------------------');

        // 4. Validate Global Execution Counters
        expect(metricsOutput).toContain('execution_success_total 10');
        expect(metricsOutput).toContain('execution_failure_total 5');

        // 5. Validate Agent Failures Counter (BackendFailed)
        expect(metricsOutput).toContain('agent_failures_total{agent_name="BackendAgent"} 5');

        // 6. Validate High Cardinality Protection (Should ONLY have exactly 'agent_name' and 'status' labels)
        // We ensure we don't accidentally leak executionIds or timestamps into labels which explode cardinality.
        expect(metricsOutput).not.toMatch(/executionId=/);
        expect(metricsOutput).not.toMatch(/userId=/);
        expect(metricsOutput).not.toMatch(/timestamp=/);

        // 7. Validate Histograms exist and have been populated
        expect(metricsOutput).toContain('agent_execution_duration_seconds_count');
        expect(metricsOutput).toContain('agent_execution_duration_seconds_sum');

        // There should be a bucket count for DatabaseAgent success
        expect(metricsOutput).toContain('agent_execution_duration_seconds_bucket{le="1",agent_name="DatabaseAgent",status="success"} 15');

        // There should be bucket counts for the 5 Backend agent failures
        expect(metricsOutput).toContain('agent_execution_duration_seconds_bucket{le="1",agent_name="BackendAgent",status="failure"} 5');

        // And 10 Backend agent successes
        expect(metricsOutput).toContain('agent_execution_duration_seconds_bucket{le="1",agent_name="BackendAgent",status="success"} 10');

    }, 30000);
});
