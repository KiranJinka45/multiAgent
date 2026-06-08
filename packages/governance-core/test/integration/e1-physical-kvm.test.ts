import { describe, it, expect } from 'vitest';
import { PhysicalFirecrackerAdapter, KvmAccessError } from '../../src/isolation/physical-firecracker.js';

describe('Phase E1: Physical KVM Verification', () => {
    it('should throw KvmAccessError on Windows or non-KVM host during spawnVm', async () => {
        const adapter = new PhysicalFirecrackerAdapter();
        adapter.disableFallback = true;
        const config = {
            vmId: 'test-vm-kvm',
            kernelImagePath: '/var/lib/ztan/vmlinux',
            rootfsPath: '/var/lib/ztan/rootfs/test.ext4',
            memorySizeMb: 512,
            vcpuCount: 2
        };

        // On Windows or environments without /dev/kvm, spawnVm should throw KvmAccessError
        await expect(adapter.spawnVm(config)).rejects.toThrow(KvmAccessError);
    });

    it('should correctly serialize machine configuration, boot source, and drive config according to Firecracker schemas', () => {
        const adapter = new PhysicalFirecrackerAdapter();
        const config = {
            vmId: 'test-vm-kvm',
            kernelImagePath: '/var/lib/ztan/vmlinux',
            rootfsPath: '/var/lib/ztan/rootfs/test.ext4',
            memorySizeMb: 512,
            vcpuCount: 2
        };

        const mc = adapter.serializeMachineConfig(config);
        expect(mc).toEqual({
            vcpu_count: 2,
            mem_size_mib: 512
        });

        const bs = adapter.serializeBootSource(config);
        expect(bs).toEqual({
            kernel_image_path: '/var/lib/ztan/vmlinux',
            boot_args: "console=ttyS0 reboot=k panic=1 pci=off"
        });

        const dr = adapter.serializeDriveConfig(config);
        expect(dr).toEqual({
            drive_id: "rootfs",
            path_on_host: '/var/lib/ztan/rootfs/test.ext4',
            is_root_device: true,
            is_read_only: true
        });
    });
});
