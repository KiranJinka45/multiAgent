import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '@packages/observability';

export class WalCompactor {
    constructor(private readonly walDir: string) {}

    /**
     * Compacts the WAL directory by pruning segment log files
     * that only contain blocks older than the specified snapshotSequence.
     */
    public compact(snapshotSequence: number): { prunedSegments: string[]; bytesReclaimed: number } {
        const prunedSegments: string[] = [];
        let bytesReclaimed = 0;

        if (!fs.existsSync(this.walDir)) {
            return { prunedSegments, bytesReclaimed };
        }

        const files = fs.readdirSync(this.walDir)
            .filter(f => f.startsWith('segment_') && f.endsWith('.log'));

        for (const file of files) {
            const filePath = path.join(this.walDir, file);
            try {
                const stat = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(l => l.trim().length > 0);

                if (lines.length === 0) {
                    // Delete empty segment file if it's not the active one
                    // Active files are usually opened in a+ mode and have size >= 0
                    // We'll safely delete empty inactive segments
                    continue;
                }

                let maxSeqInSegment = -1;
                for (const line of lines) {
                    try {
                        const block = JSON.parse(line);
                        if (block && typeof block.sequence === 'number') {
                            if (block.sequence > maxSeqInSegment) {
                                maxSeqInSegment = block.sequence;
                            }
                        }
                    } catch {
                        // Skip corrupted/probe line
                    }
                }

                // If max sequence in segment is strictly less than snapshotSequence,
                // all data in this segment has been checkpointed in the snapshot.
                if (maxSeqInSegment !== -1 && maxSeqInSegment < snapshotSequence) {
                    fs.unlinkSync(filePath);
                    prunedSegments.push(file);
                    bytesReclaimed += stat.size;
                    logger.info(`[WAL COMPACTOR] Pruned obsolete segment ${file} (max sequence: ${maxSeqInSegment} < snapshot: ${snapshotSequence}), reclaimed ${stat.size} bytes`);
                }
            } catch (err: any) {
                logger.error(`[WAL COMPACTOR] Error processing segment ${file}: ${err.message}`);
            }
        }

        return { prunedSegments, bytesReclaimed };
    }
}
