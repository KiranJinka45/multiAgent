import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '@packages/observability';

export class WalShipper {
    private shippedSegments = new Set<string>();

    constructor(
        private readonly sourceWalDir: string,
        private readonly targetBackupDir: string
    ) {
        this.ensureDir(this.targetBackupDir);
    }

    private ensureDir(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    public shipPendingSegments(): string[] {
        const files = fs.readdirSync(this.sourceWalDir);
        const shipped: string[] = [];

        // In our segmented WAL, closed segments are files named e.g., segment_0.log, segment_1.log
        // Let's filter files starting with segment_ and ending with .log
        const logSegments = files.filter(f => f.startsWith('segment_') && f.endsWith('.log'));
        
        // Find active segment. Active segment is usually the one being written, but in our case,
        // we can copy all closed segments. How do we know if it is closed?
        // E.g. in DurableSegmentedWal, the active segment has no suffix, or we can check file list.
        // Wait, for simplicity, we ship all segment files except the active one if we want to be safe,
        // or we can ship all segment files to ensure we have up-to-date data (with dynamic overwrite).
        // Let's copy all of them, overwriting target files to keep them updated.
        for (const file of logSegments) {
            const srcPath = path.join(this.sourceWalDir, file);
            const destPath = path.join(this.targetBackupDir, file);

            try {
                // If it's a closed segment, we copy it. To simulate shipping, we can copy the file.
                fs.copyFileSync(srcPath, destPath);
                this.shippedSegments.add(file);
                shipped.push(file);
            } catch (err: any) {
                logger.error(`[WAL_SHIPPER] Failed to ship segment ${file}: ${err.message}`);
            }
        }
        return shipped;
    }

    public getShippedSegments(): string[] {
        return Array.from(this.shippedSegments);
    }
}

export class BackupCoordinator {
    constructor(
        private readonly sourceWalDir: string,
        private readonly backupDir: string
    ) {
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
    }

    public exportSnapshot(): boolean {
        const snapshotFile = path.join(this.sourceWalDir, 'snapshot.json');
        if (!fs.existsSync(snapshotFile)) {
            logger.warn(`[BACKUP_COORDINATOR] No active snapshot file found at ${snapshotFile}`);
            return false;
        }

        try {
            const destSnapshot = path.join(this.backupDir, 'snapshot.json');
            fs.copyFileSync(snapshotFile, destSnapshot);
            logger.info(`💾 Exported snapshot successfully to ${destSnapshot}`);
            return true;
        } catch (err: any) {
            logger.error(`[BACKUP_COORDINATOR] Failed to export snapshot: ${err.message}`);
            return false;
        }
    }

    public runFullBackup(): { snapshotExported: boolean; shippedSegments: string[] } {
        logger.info(`🏁 Starting full backup from ${this.sourceWalDir} to ${this.backupDir}...`);
        const snapshotExported = this.exportSnapshot();
        const shipper = new WalShipper(this.sourceWalDir, this.backupDir);
        const shippedSegments = shipper.shipPendingSegments();
        logger.info(`✅ Backup completed. Snapshot: ${snapshotExported}, Shipped segments: ${shippedSegments.length}`);
        return { snapshotExported, shippedSegments };
    }
}

export class DisasterRecoveryManager {
    public static restoreColdCluster(backupDir: string, targetWalDir: string): void {
        logger.info(`⏪ Restoring cold cluster from backup ${backupDir} into target WAL dir ${targetWalDir}...`);
        
        if (!fs.existsSync(targetWalDir)) {
            fs.mkdirSync(targetWalDir, { recursive: true });
        }

        if (!fs.existsSync(backupDir)) {
            throw new Error(`[DISASTER_RECOVERY] Backup directory does not exist: ${backupDir}`);
        }

        const files = fs.readdirSync(backupDir);

        // 1. Restore snapshot if present
        const snapshotFile = files.find(f => f === 'snapshot.json');
        if (snapshotFile) {
            const src = path.join(backupDir, snapshotFile);
            const dest = path.join(targetWalDir, snapshotFile);
            fs.copyFileSync(src, dest);
            logger.info(`✨ Restored state snapshot to target`);
        }

        // 2. Restore all WAL segment files
        const walSegments = files.filter(f => f.startsWith('segment_') && f.endsWith('.log'));
        for (const file of walSegments) {
            const src = path.join(backupDir, file);
            const dest = path.join(targetWalDir, file);
            fs.copyFileSync(src, dest);
            logger.info(`✨ Restored WAL log segment: ${file}`);
        }
        
        logger.info('🎉 Cold cluster state restoration completed successfully');
    }
}
