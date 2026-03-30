import { ChildProcess } from 'child_process';
import { MicroVMProvider, FirecrackerDriver, MicroVMConfig } from './microvm-provider';
import { SnapshotOverlayManager } from './snapshot-overlay';
import { SnapshotLibrary } from './snapshot-library';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '@packages/utils/server';

export class MicroVMManager {
    private static provider: MicroVMProvider = new FirecrackerDriver();
    private static activeVMs = new Map<string, { child: ChildProcess, config: MicroVMConfig }>();

    static async allocateSandbox(projectId: string, framework: string): Promise<string> {
        logger.info({ projectId, framework }, '[MicroVMManager] Allocating MicroVM Sandbox...');

        const snapshot = await SnapshotLibrary.getSnapshot(framework);
        if (!snapshot) {
            throw new Error(`No base snapshot found for framework: ${framework}`);
        }

        const projectPath = path.join(process.cwd(), 'projects', projectId);
        const overlayPath = path.join(process.cwd(), '.microvms', projectId);
        
        await fs.ensureDir(projectPath);
        await fs.ensureDir(overlayPath);

        // 1. Prepare Filesystem Overlay (Phase 15: Snapshot + Project Layer)
        await SnapshotOverlayManager.prepareOverlay({
            baseSnapshotPath: snapshot.path,
            projectPath: projectPath,
            overlayPath: overlayPath
        });

        // 2. Define VM Configuration
        const config: MicroVMConfig = {
            id: projectId,
            kernelPath: '/etc/microvm/vmlinux', // Placeholder path
            rootfsPath: path.join(overlayPath, 'merged'), // Target merged layer
            cpuCores: 1,
            memoryMb: 1024
        };

        // 3. Boot the MicroVM (Hardware-level Isolation)
        const child = await this.provider.boot(config);
        this.activeVMs.set(projectId, { child, config });

        logger.info({ projectId }, '[MicroVMManager] MicroVM Sandbox successfully allocated and booted.');

        // In a real environment, we'd return the IP or domain of the VM
        // For simulation, we return the path to the merged filesystem
        return config.rootfsPath;
    }

    static async terminateSandbox(projectId: string): Promise<void> {
        const vm = this.activeVMs.get(projectId);
        if (vm) {
            await this.provider.shutdown(projectId);
            vm.child.kill();
            this.activeVMs.delete(projectId);
            
            const overlayPath = path.join(process.cwd(), '.microvms', projectId);
            await SnapshotOverlayManager.cleanupOverlay(overlayPath);
            
            logger.info({ projectId }, '[MicroVMManager] MicroVM Sandbox terminated and cleaned up.');
        }
    }

    static getVMStatus(projectId: string) {
        return this.activeVMs.has(projectId) ? 'running' : 'not_found';
    }
}
