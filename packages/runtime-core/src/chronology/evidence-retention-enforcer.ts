import fs from 'fs';
import path from 'path';

/**
 * ─── ZTAN Evidence Retention Enforcer ────────────────────────────────────────
 * Mechanically manages the storage overhead of the Evidence Vault. Expired
 * telemetry is pruned based on TTL limits, and storage pressure thresholds
 * trigger deletion of oldest files first, keeping incident snapshots protected.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface PruneStats {
    scannedCount: number;
    deletedCount: number;
    reclaimedBytes: number;
    errors: string[];
}

export class EvidenceRetentionEnforcer {
    private vaultDir: string;
    private maxSizeBytes: number;
    private fileTtlMs: number;

    constructor(workspaceRoot: string, maxSizeBytes: number = 50 * 1024 * 1024, fileTtlMs: number = 7 * 24 * 60 * 60 * 1000) {
        this.vaultDir = path.resolve(workspaceRoot, '.ztan', 'evidence-vault');
        this.maxSizeBytes = maxSizeBytes;
        this.fileTtlMs = fileTtlMs;
    }

    private getAllFiles(dir: string): string[] {
        let files: string[] = [];
        if (!fs.existsSync(dir)) return files;
        const list = fs.readdirSync(dir);
        for (const item of list) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                files = files.concat(this.getAllFiles(fullPath));
            } else {
                files.push(fullPath);
            }
        }
        return files;
    }

    /**
     * Scans and cleans up files violating TTL and storage space budgets.
     */
    enforce(): PruneStats {
        const stats: PruneStats = {
            scannedCount: 0,
            deletedCount: 0,
            reclaimedBytes: 0,
            errors: []
        };

        try {
            const files = this.getAllFiles(this.vaultDir);
            stats.scannedCount = files.length;

            const now = Date.now();
            const eligibleFiles: Array<{ filePath: string; mtimeMs: number; sizeBytes: number; isProtected: boolean }> = [];
            let totalVaultSize = 0;

            for (const file of files) {
                const stat = fs.statSync(file);
                totalVaultSize += stat.size;

                // Protect raw incidents or explicit protected tags from general cleanup
                const basename = path.basename(file);
                const isProtected = basename.startsWith('incident-') || basename.includes('protected');

                eligibleFiles.push({
                    filePath: file,
                    mtimeMs: stat.mtimeMs,
                    sizeBytes: stat.size,
                    isProtected
                });
            }

            // 1. Pass 1: Prune expired records (older than TTL)
            for (const file of eligibleFiles) {
                if (!file.isProtected && (now - file.mtimeMs) > this.fileTtlMs) {
                    try {
                        fs.unlinkSync(file.filePath);
                        stats.deletedCount++;
                        stats.reclaimedBytes += file.sizeBytes;
                        totalVaultSize -= file.sizeBytes;
                    } catch (err: any) {
                        stats.errors.push(`Failed to delete expired file ${file.filePath}: ${err.message}`);
                    }
                }
            }

            // 2. Pass 2: Clean up oldest non-protected files under storage pressure
            if (totalVaultSize > this.maxSizeBytes) {
                const sortedUnprotected = eligibleFiles
                    .filter(f => !f.isProtected && fs.existsSync(f.filePath))
                    .sort((a, b) => a.mtimeMs - b.mtimeMs);

                for (const file of sortedUnprotected) {
                    if (totalVaultSize <= this.maxSizeBytes) {
                        break;
                    }
                    try {
                        fs.unlinkSync(file.filePath);
                        stats.deletedCount++;
                        stats.reclaimedBytes += file.sizeBytes;
                        totalVaultSize -= file.sizeBytes;
                    } catch (err: any) {
                        stats.errors.push(`Failed to delete storage-pressure file ${file.filePath}: ${err.message}`);
                    }
                }
            }
        } catch (err: any) {
            stats.errors.push(`Scan execution error: ${err.message}`);
        }

        return stats;
    }
}
