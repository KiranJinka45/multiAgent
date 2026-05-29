import { ContainerOrchestrator } from '../isolation/container-orchestrator.js';

export interface ContainerPressureTest {
    name: string;
    description: string;
    vector: string;
    memoryLimitMb: number;
    pidsLimit: number;
}

export class ContainerPressureFuzzer {
    static runFuzzingCampaign(): {
        total: number;
        survived: number;
        exhausted: number;
        results: { test: ContainerPressureTest; survived: boolean; response: string }[]
    } {
        const tests: ContainerPressureTest[] = [
            {
                name: 'tmpfs Flooding (Memory Starvation)',
                description: 'Attempts to fill the /tmp tmpfs mount with a massive zero-byte file.',
                vector: 'dd if=/dev/zero of=/tmp/flood bs=1M count=100 || echo "DD_FAILED"',
                memoryLimitMb: 50,
                pidsLimit: 50
            },
            {
                name: 'PID Churn (Process Table Exhaustion)',
                description: 'Spawns and kills processes in an infinite loop to churn the container PID namespace.',
                vector: 'for i in $(seq 1 1000); do sh -c "echo 1 > /dev/null" & done; wait',
                memoryLimitMb: 50,
                pidsLimit: 50
            },
            {
                name: 'Inode Exhaustion',
                description: 'Creates thousands of empty files in /tmp to exhaust inodes.',
                vector: 'mkdir -p /tmp/inodes && for i in $(seq 1 10000); do touch /tmp/inodes/file_$i 2>/dev/null || break; done; ls -1 /tmp/inodes | wc -l',
                memoryLimitMb: 50,
                pidsLimit: 50
            }
        ];

        let survivedCount = 0;
        let exhaustedCount = 0;
        const results = [];

        for (const test of tests) {
            let survived = false;
            let response = '';

            try {
                const res = ContainerOrchestrator.runIsolated({
                    image: 'python:3.10-alpine',
                    command: ['sh', '-c', test.vector],
                    memoryLimitMb: test.memoryLimitMb,
                    pidsLimit: test.pidsLimit,
                    dropAllCaps: true,
                    readOnlyRootfs: true
                });

                // Analysis of the result
                if (!res.success) {
                    survived = true; // The container constraints correctly killed or stopped the exhaustion
                    if (res.error?.includes('No space left on device')) {
                        response = 'SURVIVED: tmpfs constrained by memory limits (No space left on device).';
                    } else if (res.error?.includes('Resource temporarily unavailable')) {
                        response = 'SURVIVED: PID/Resource limits enforced correctly.';
                    } else if (res.error?.includes('Out of memory') || res.error?.includes('Killed')) {
                        response = 'SURVIVED: OOM Killer terminated the payload before host degradation.';
                    } else {
                        response = `SURVIVED: Container gracefully denied execution: ${res.error?.substring(0, 50).trim()}`;
                    }
                } else {
                    // It succeeded in executing. Did it exhaust?
                    if (test.name.includes('tmpfs Flooding')) {
                        if (res.output.includes('DD_FAILED')) {
                            survived = true;
                            response = 'SURVIVED: dd failed to allocate memory.';
                        } else {
                            survived = false;
                            response = 'EXHAUSTED: Payload successfully wrote large tmpfs block, bypassing memory cgroup limits?';
                        }
                    } else if (test.name.includes('PID Churn')) {
                        survived = true;
                        response = `SURVIVED: Process table churn completed without hanging the daemon.`;
                    } else if (test.name.includes('Inode Exhaustion')) {
                        const count = parseInt(res.output.trim(), 10);
                        if (isNaN(count) || count < 10000) {
                            survived = true;
                            response = `SURVIVED: Inode creation stopped at ${count}.`;
                        } else {
                            survived = false;
                            response = `EXHAUSTED: Successfully created 10,000 files in tmpfs without hitting inode caps.`;
                        }
                    }
                }

                if (survived) survivedCount++;
                else exhaustedCount++;

            } catch (err: any) {
                survived = false;
                exhaustedCount++;
                response = `EXHAUSTED: Test harness crashed evaluating the vector: ${err.message}`;
            }

            results.push({
                test,
                survived,
                response
            });
        }

        return {
            total: tests.length,
            survived: survivedCount,
            exhausted: exhaustedCount,
            results
        };
    }
}
