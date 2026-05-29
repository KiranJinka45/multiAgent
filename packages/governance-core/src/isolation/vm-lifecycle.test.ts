import { IsolatedExecutionRunner } from './vm-lifecycle.js';
import { FirecrackerOrchestrator, MockFirecrackerAdapter } from './firecracker-orchestrator.js';
import { describe, it, expect, vi } from 'vitest';

describe('Isolated Execution Runner', () => {
    it('should guarantee destruction in finally block even if execution throws', async () => {
        const adapter = new MockFirecrackerAdapter();
        const orchestrator = new FirecrackerOrchestrator(adapter);
        const runner = new IsolatedExecutionRunner(orchestrator);
        
        const killSpy = vi.spyOn(adapter, 'killVm');

        // Force the execution command to reject
        vi.spyOn(adapter, 'executeCommand').mockRejectedValueOnce(new Error('Process Crash'));

        try {
            await runner.executeIsolated('vm-crash-test', 'bad-command');
        } catch (e) {
            // Expected to throw
        }

        // The finally block must still execute the killVm
        expect(killSpy).toHaveBeenCalledWith('vm-crash-test');
    });

    it('should throw constraint violation if requested memory is too high', async () => {
        const adapter = new MockFirecrackerAdapter();
        const orchestrator = new FirecrackerOrchestrator(adapter);
        const runner = new IsolatedExecutionRunner(orchestrator);

        await expect(runner.executeIsolated('vm-mem-test', 'cmd', { memorySizeMb: 4096 }))
            .rejects
            .toThrow('exceeds maximum 2048MB boundary');
    });
});
