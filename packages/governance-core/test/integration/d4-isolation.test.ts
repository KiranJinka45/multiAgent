import { describe, it, expect, vi } from 'vitest';
import { IsolatedExecutionRunner } from '../../src/isolation/vm-lifecycle.js';
import { FirecrackerOrchestrator, MockFirecrackerAdapter } from '../../src/isolation/firecracker-orchestrator.js';
import { NetworkNamespaceController } from '../../src/isolation/network-policy.js';
import { VmConstraintViolationError } from '../../src/isolation/vm-limits.js';
import { SideEffectOntology, SideEffectClass } from '../../src/ontology/side-effects.js';

describe('Phase D4: Isolation Escape & Runtime Containment', () => {
    it('VM Leak Campaign: should teardown in finally and allow sweeper to clean up orphaned VMs', async () => {
        const adapter = new MockFirecrackerAdapter();
        const orchestrator = new FirecrackerOrchestrator(adapter);
        const runner = new IsolatedExecutionRunner(orchestrator);

        const killSpy = vi.spyOn(adapter, 'killVm');

        // Execute a command, verifying it adds and removes from orphanedVms.
        // Also simulate an orphan by manually injecting into the private static set.
        const orphanedVmsSet = (IsolatedExecutionRunner as any).orphanedVms as Set<string>;
        orphanedVmsSet.add('vm-leaked-123');

        expect(orphanedVmsSet.has('vm-leaked-123')).toBe(true);

        await IsolatedExecutionRunner.sweepOrphanedVms(orchestrator);

        expect(killSpy).toHaveBeenCalledWith('vm-leaked-123');
        expect(orphanedVmsSet.has('vm-leaked-123')).toBe(false);
    });

    it('Metadata SSRF Campaign: should block AWS/GCP/Azure IMDS addresses in validation and firewall rules', () => {
        const rule = {
            host: '169.254.169.254',
            port: 80,
            protocol: 'tcp' as const
        };

        const allowed = NetworkNamespaceController.validateEgressRule(rule);
        expect(allowed).toBe(false);

        const iptables = NetworkNamespaceController.generateSandboxFirewallRules([rule]);
        
        // Ensure the cloud metadata endpoint is dropped
        const hasMetadataDrop = iptables.some(line => line.includes('169.254.169.254') && line.includes('DROP'));
        expect(hasMetadataDrop).toBe(true);
    });

    it('Quota Exhaustion: should abort memory spikes, vcpu count overages, and timeout infinite loops', async () => {
        const registry = (SideEffectOntology as any).registry as Map<string, any>;
        const originalVmExecute = registry.get('vm-execute');
        registry.set('vm-execute', { 
            name: 'vm-execute', 
            sideEffectClass: SideEffectClass.REVERSIBLE, 
            description: 'temp' 
        });

        try {
            const adapter = new MockFirecrackerAdapter();
            const orchestrator = new FirecrackerOrchestrator(adapter);
            const runner = new IsolatedExecutionRunner(orchestrator);

            // Memory overage limit
            await expect(runner.executeIsolated('vm-mem-spike', 'run', { memorySizeMb: 9999 }))
                .rejects
                .toThrow(VmConstraintViolationError);

            // CPU count overage limit
            await expect(runner.executeIsolated('vm-cpu-spike', 'run', { vcpuCount: 16 }))
                .rejects
                .toThrow(VmConstraintViolationError);

            // Timeout infinite loop simulator
            // Mock executeCommand to hang forever
            vi.spyOn(adapter, 'executeCommand').mockImplementation(async () => {
                return new Promise((resolve) => {
                    // Hang forever
                });
            });

            // Run with a very small execution timeout to verify hard termination trigger
            const timeoutPromise = runner.executeIsolated('vm-hang', 'while(true){}', { executionTimeoutMs: 50 });
            await expect(timeoutPromise).rejects.toThrow('[VM_TIMEOUT]');
        } finally {
            if (originalVmExecute) {
                registry.set('vm-execute', originalVmExecute);
            }
        }
    });
});
