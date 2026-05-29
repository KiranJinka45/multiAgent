import { describe, it, expect } from 'vitest';
import { IsolatedExecutionRunner } from '../../src/isolation/vm-lifecycle.js';
import { FirecrackerOrchestrator, MockFirecrackerAdapter } from '../../src/isolation/firecracker-orchestrator.js';
import { SideEffectOntology, SideEffectClass } from '../../src/ontology/side-effects.js';

describe('Phase E5: Disk Full & OOM Recovery Tests', () => {
    it('should sweep and clean up orphaned VMs even when the orchestrator encounters errors', async () => {
        const failingAdapter = new class extends MockFirecrackerAdapter {
            async killVm(vmId: string): Promise<void> {
                throw new Error('Disk full: cannot write process lockfile or kill state');
            }
        };

        const orchestrator = new FirecrackerOrchestrator(failingAdapter);
        const orphanedVmsSet = (IsolatedExecutionRunner as any).orphanedVms as Set<string>;
        
        orphanedVmsSet.add('vm-oom-test-leaked');

        // Execute sweeper. Even if the orchestrator killVm throws an error, the sweeper should log it and clear the set to avoid infinite leaks.
        await IsolatedExecutionRunner.sweepOrphanedVms(orchestrator);
        
        expect(orphanedVmsSet.has('vm-oom-test-leaked')).toBe(false);
    });

    it('should fail-closed during VM startup if the rootfs path is missing/unwritable (simulated)', async () => {
        const registry = (SideEffectOntology as any).registry as Map<string, any>;
        const originalVmExecute = registry.get('vm-execute');
        registry.set('vm-execute', { 
            name: 'vm-execute', 
            sideEffectClass: SideEffectClass.REVERSIBLE, 
            description: 'temp' 
        });

        try {
            const errorAdapter = new class extends MockFirecrackerAdapter {
                async spawnVm(): Promise<void> {
                    throw new Error('[DISK_ERROR] No space left on device');
                }
            };

            const orchestrator = new FirecrackerOrchestrator(errorAdapter);
            const runner = new IsolatedExecutionRunner(orchestrator);

            await expect(
                runner.executeIsolated('vm-disk-full', 'run')
            ).rejects.toThrow('[DISK_ERROR] No space left on device');

            // Ensure the VM is not registered as orphaned after failing to start
            const orphanedVmsSet = (IsolatedExecutionRunner as any).orphanedVms as Set<string>;
            expect(orphanedVmsSet.has('vm-disk-full')).toBe(false);
        } finally {
            if (originalVmExecute) {
                registry.set('vm-execute', originalVmExecute);
            }
        }
    });
});
