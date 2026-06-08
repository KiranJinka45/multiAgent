import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { VmConstraintMonitor, VmConstraintViolationError } from '../../src/isolation/vm-limits.js';
import { CgroupController } from '../../src/isolation/cgroup-controller.js';
import { IsolatedExecutionRunner } from '../../src/isolation/vm-lifecycle.js';
import { FirecrackerOrchestrator, MockFirecrackerAdapter } from '../../src/isolation/firecracker-orchestrator.js';
import { SideEffectOntology, SideEffectClass } from '../../src/ontology/side-effects.js';

vi.mock('fs', () => {
    return {
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
    };
});

describe('Phase E2: Cgroup Starvation Tests', () => {
    it('should validate memory limit assertions strictly', () => {
        expect(() => {
            VmConstraintMonitor.assertSafeQuotas({ memorySizeMb: 4096 });
        }).toThrow(VmConstraintViolationError);

        expect(() => {
            VmConstraintMonitor.assertSafeQuotas({ vcpuCount: 8 });
        }).toThrow(VmConstraintViolationError);
    });

    it('should correctly configure cgroups path when supported', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', {
            value: 'linux',
            configurable: true
        });

        try {
            CgroupController.applyMemoryLimit('vm-cgroup-test', 1024 * 1024 * 512);
            expect(fs.mkdirSync).toHaveBeenCalledWith(path.normalize('/sys/fs/cgroup/ztan-sandbox/vm-cgroup-test'), { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledWith(path.normalize('/sys/fs/cgroup/ztan-sandbox/vm-cgroup-test/memory.max'), '536870912');

            CgroupController.applyCpuLimit('vm-cgroup-test', 0.5); // 50% CPU
            expect(fs.writeFileSync).toHaveBeenCalledWith(path.normalize('/sys/fs/cgroup/ztan-sandbox/vm-cgroup-test/cpu.max'), '50000 100000');
        } finally {
            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
                configurable: true
            });
            vi.mocked(fs.mkdirSync).mockClear();
            vi.mocked(fs.writeFileSync).mockClear();
        }
    });

    it('should fail-closed under simulated cgroup CPU starvation (timeout)', async () => {
        const registry = (SideEffectOntology as unknown as { registry: Map<string, unknown> }).registry;
        const originalVmExecute = registry.get('vm-execute');
        registry.set('vm-execute', { 
            name: 'vm-execute', 
            sideEffectClass: SideEffectClass.REVERSIBLE, 
            description: 'temp' 
        });

        try {
            // Build a runner with an adapter that simulates infinite execution (CPU starvation hang)
            const hangAdapter = new class extends MockFirecrackerAdapter {
                async executeCommand(): Promise<string> {
                    return new Promise((resolve) => {
                        setTimeout(() => resolve('Finished after delay'), 2000);
                    });
                }
            };

            const orchestrator = new FirecrackerOrchestrator(hangAdapter);
            const runner = new IsolatedExecutionRunner(orchestrator);

            // We run with a very low execution timeout representing starvation starvation boundary
            await expect(
                runner.executeIsolated('vm-starve', 'long-task', { executionTimeoutMs: 50 })
            ).rejects.toThrow('[VM_TIMEOUT] Execution exceeded hard limit');
        } finally {
            if (originalVmExecute) {
                registry.set('vm-execute', originalVmExecute);
            }
        }
    });
});
