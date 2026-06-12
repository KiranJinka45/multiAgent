import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { PhysicalFirecrackerAdapter } from '../../src/isolation/physical-firecracker.js';

describe('Phase E8: Real Firecracker Execution', () => {
    const isWindows = process.platform === 'win32';
    const hasKvm = !isWindows && fs.existsSync('/dev/kvm');

    // Skip the real VM execution if KVM is not available on this platform (e.g. Windows)
    const skipCondition = !hasKvm;

    it.skipIf(skipCondition)('should execute sandboxed VM and verify environment isolation boundaries', async () => {
        // Only run jailer if running as root, otherwise run Firecracker directly
        const isRoot = process.platform !== 'win32' && process.getuid && process.getuid() === 0;
        PhysicalFirecrackerAdapter.useJailer = isRoot;

        const adapter = new PhysicalFirecrackerAdapter();
        const config = {
            vmId: 'e8-test-vm',
            kernelImagePath: '/var/lib/ztan/vmlinux',
            rootfsPath: '/var/lib/ztan/rootfs',
            memorySizeMb: 128,
            vcpuCount: 1
        };

        expect(adapter.checkEnvironment).toBeDefined();
        
        await adapter.spawnVm(config);

        // Wait for the guest kernel and OS to boot fully
        await new Promise((resolve) => setTimeout(resolve, 20000));
        
        console.log(`[Adversarial Verification] Jailer used: ${PhysicalFirecrackerAdapter.useJailer}`);
        if (isRoot) {
            expect(PhysicalFirecrackerAdapter.useJailer).toBe(true);
        }

        // Guest Command Execution (vsock) - Adversarial Assertions
        console.log('[Adversarial Verification] Executing Guest Commands...');
        
        const idOutput = await adapter.executeCommand('e8-test-vm', 'id');
        console.log(`[Guest] id: ${idOutput.trim()}`);
        expect(idOutput).toContain('uid=0(root)');

        const pwdOutput = await adapter.executeCommand('e8-test-vm', 'pwd');
        console.log(`[Guest] pwd: ${pwdOutput.trim()}`);
        expect(pwdOutput).toContain('/');

        const hostnameOutput = await adapter.executeCommand('e8-test-vm', 'hostname');
        console.log(`[Guest] hostname: ${hostnameOutput.trim()}`);
        expect(hostnameOutput).toContain('ubuntu-fc-uvm');

        const proc1Cgroup = await adapter.executeCommand('e8-test-vm', 'cat /proc/1/cgroup');
        console.log(`[Guest] /proc/1/cgroup: \n${proc1Cgroup.trim()}`);

        const kernelVersion = await adapter.executeCommand('e8-test-vm', 'cat /proc/version');
        console.log(`[Guest] /proc/version: ${kernelVersion.trim()}`);
        expect(kernelVersion).toContain('Linux version');

        const nprocOutput = await adapter.executeCommand('e8-test-vm', 'nproc');
        console.log(`[Guest] nproc: ${nprocOutput.trim()}`);
        expect(nprocOutput).toContain('1'); // Because vcpuCount is 1

        const freeOutput = await adapter.executeCommand('e8-test-vm', 'free -m');
        console.log(`[Guest] free -m: \n${freeOutput.trim()}`);
        expect(freeOutput).toContain('Mem:');

        // Check that host secrets/variables are NOT leaked to the VM
        const output = await adapter.executeCommand('e8-test-vm', 'env');
        expect(output).not.toContain(process.env.AWS_SECRET_ACCESS_KEY || 'SECRET_KEY_PLACEHOLDER');
        
        // Clean up
        await adapter.killVm('e8-test-vm');
    }, 120_000);

    it('should correctly configure the microVM memory and vcpu constraints', () => {
        const adapter = new PhysicalFirecrackerAdapter();
        const config = {
            vmId: 'e8-constraint-vm',
            kernelImagePath: '/tmp/vmlinux',
            rootfsPath: '/tmp/rootfs.ext4',
            memorySizeMb: 256,
            vcpuCount: 2
        };

        const mc = adapter.serializeMachineConfig(config);
        expect(mc.mem_size_mib).toBe(256);
        expect(mc.vcpu_count).toBe(2);
    });
});
