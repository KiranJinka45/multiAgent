import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { canonicalizeJson } from './replay.js';
import type { EventBlock, StateSnapshot } from './event-store.js';
import { ztanWalThroughputBytes } from '@packages/observability';

export interface WALConfig {
    walDir: string;
    maxSegmentSizeBytes?: number;
    syncEveryWrite?: boolean;
}

export class WALCorruptException extends Error {
    constructor(message: string) {
        super(`[WAL::CORRUPT] ${message}`);
        this.name = 'WALCorruptException';
    }
}

export class DurableSegmentedWal<E = any> {
    private walDir: string;
    private maxSegmentSize: number;
    private syncEveryWrite: boolean;
    private activeFileHandle: number | null = null;
    private activeSegmentIndex = 0;
    private currentSegmentSize = 0;
    private lastHash = 'genesis';
    private nextSequence = 1;

    constructor(config: WALConfig) {
        this.walDir = config.walDir;
        this.maxSegmentSize = config.maxSegmentSizeBytes || 1024 * 1024; // 1MB default segment rotation
        this.syncEveryWrite = config.syncEveryWrite ?? true;

        if (!fs.existsSync(this.walDir)) {
            fs.mkdirSync(this.walDir, { recursive: true });
        }
    }

    public getWalDir(): string {
        return this.walDir;
    }

    public getNextSequence(): number {
        return this.nextSequence;
    }

    /**
     * Appends a new event block atomically to the active disk segment.
     */
    public append(payload: E, timestamp = Date.now()): EventBlock<E> {
        const sequence = this.nextSequence++;
        
        // 1. Generate Block cryptographic layout
        const blockData = {
            sequence,
            prevHash: this.lastHash,
            timestamp,
            payload
        };
        const blockHash = crypto.createHash('sha256').update(canonicalizeJson(blockData)).digest('hex');

        // 2. Generate payload checksum to guard against partial bit rot / half-writes
        const payloadStr = JSON.stringify(payload);
        const checksum = crypto.createHash('sha256').update(payloadStr).digest('hex');

        const block: EventBlock<E> & { checksum: string } = {
            ...blockData,
            hash: blockHash,
            checksum
        };

        const serialized = JSON.stringify(block) + '\n';
        const buffer = Buffer.from(serialized, 'utf8');

        // 3. Rotate segment if size threshold crossed
        if (this.currentSegmentSize + buffer.length > this.maxSegmentSize) {
            this.rotateActiveSegment();
        }

        // 4. Write to active segment file descriptor
        this.ensureActiveSegmentOpen();
        fs.writeSync(this.activeFileHandle!, buffer, 0, buffer.length, null);

        if (this.syncEveryWrite) {
            fs.fsyncSync(this.activeFileHandle!);
        }

        this.currentSegmentSize += buffer.length;
        this.lastHash = blockHash;

        ztanWalThroughputBytes.inc(buffer.length);

        return block;
    }

    /**
     * Appends a pre-calculated, verified block directly to the log.
     * Essential for maintaining cryptographic replication identity on standby followers.
     */
    public appendBlock(block: EventBlock<E> & { checksum: string }): void {
        const serialized = JSON.stringify(block) + '\n';
        const buffer = Buffer.from(serialized, 'utf8');

        if (this.currentSegmentSize + buffer.length > this.maxSegmentSize) {
            this.rotateActiveSegment();
        }

        this.ensureActiveSegmentOpen();
        fs.writeSync(this.activeFileHandle!, buffer, 0, buffer.length, null);

        if (this.syncEveryWrite) {
            fs.fsyncSync(this.activeFileHandle!);
        }

        this.currentSegmentSize += buffer.length;
        this.lastHash = block.hash;
        this.nextSequence = block.sequence + 1;

        ztanWalThroughputBytes.inc(buffer.length);
    }

    /**
     * Scans all segment logs, validates checksums & hashes, and recovers the ledger.
     */
    public recoverLedger(): EventBlock<E>[] {
        const recoveredBlocks: EventBlock<E>[] = [];
        this.closeActiveSegment();

        const snapshotStore = new AtomicSnapshotStore(this.walDir);
        const lastSnapshot = snapshotStore.readSnapshot();

        const files = fs.readdirSync(this.walDir)
            .filter(f => f.startsWith('segment_') && f.endsWith('.log'))
            .sort((a, b) => {
                const numA = Number(a.split('_')[1].split('.')[0]);
                const numB = Number(b.split('_')[1].split('.')[0]);
                return numA - numB;
            });

        let startFromGenesis = true;
        if (lastSnapshot && files.length > 0) {
            try {
                const firstFilePath = path.join(this.walDir, files[0]);
                const firstContent = fs.readFileSync(firstFilePath, 'utf8');
                const firstLine = firstContent.split('\n')[0];
                if (firstLine.trim()) {
                    const firstBlock = JSON.parse(firstLine);
                    if (firstBlock.sequence > 1) {
                        startFromGenesis = false;
                    }
                }
            } catch (e) {
                startFromGenesis = false;
            }
        } else if (lastSnapshot) {
            startFromGenesis = false;
        }

        let expectedPrevHash = 'genesis';
        let sequence = 1;

        if (!startFromGenesis && lastSnapshot) {
            sequence = lastSnapshot.sequence + 1;
            expectedPrevHash = lastSnapshot.stateHash || 'genesis';
        }

        for (const file of files) {
            const filePath = path.join(this.walDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(l => l.trim().length > 0);

            for (let i = 0; i < lines.length; i++) {
                let block: any;
                try {
                    block = JSON.parse(lines[i]);
                } catch (err) {
                    // Truncation detected at the end of the last segment log
                    if (filePath === path.join(this.walDir, files[files.length - 1])) {
                        console.warn(`[WAL::RECOVERY] Truncated / malformed trailing write detected. Repairing segment file.`);
                        this.truncateSegmentAtLine(filePath, lines, i);
                        break;
                    } else {
                        throw new WALCorruptException(`Malformed log entry in historical segment: ${file} (Line: ${i + 1})`);
                    }
                }

                if (!startFromGenesis && lastSnapshot && block.sequence <= lastSnapshot.sequence) {
                    continue;
                }

                // Verify Payload Checksum
                const payloadStr = JSON.stringify(block.payload);
                const computedChecksum = crypto.createHash('sha256').update(payloadStr).digest('hex');
                if (block.checksum !== computedChecksum) {
                    throw new WALCorruptException(`Checksum verification failed in block sequence ${block.sequence}. Bit-rot detected.`);
                }

                // Verify Block Hash Chain Continuity
                const isFirstBlockAfterSnapshot = !startFromGenesis && lastSnapshot && block.sequence === lastSnapshot.sequence + 1;
                if (block.prevHash !== expectedPrevHash && !isFirstBlockAfterSnapshot) {
                    throw new WALCorruptException(`Hash chain continuity breach at sequence ${block.sequence}. PrevHash mismatch.`);
                }

                // Verify Cryptographic Hash Signature matches
                const blockData = {
                    sequence: block.sequence,
                    prevHash: block.prevHash,
                    timestamp: block.timestamp,
                    payload: block.payload
                };
                const computedHash = crypto.createHash('sha256').update(canonicalizeJson(blockData)).digest('hex');
                if (block.hash !== computedHash) {
                    throw new WALCorruptException(`Cryptographic block hash mismatch at sequence ${block.sequence}. Block tampered.`);
                }

                recoveredBlocks.push(block);
                expectedPrevHash = block.hash;
                sequence = block.sequence + 1;
            }
        }

        this.nextSequence = sequence;
        this.lastHash = expectedPrevHash;

        // Open last segment to resume appends
        if (files.length > 0) {
            const lastFile = files[files.length - 1];
            this.activeSegmentIndex = Number(lastFile.split('_')[1].split('.')[0]);
            const lastPath = path.join(this.walDir, lastFile);
            this.currentSegmentSize = fs.statSync(lastPath).size;
        }

        return recoveredBlocks;
    }

    private truncateSegmentAtLine(filePath: string, lines: string[], lineIndex: number): void {
        const remainingLines = lines.slice(0, lineIndex).join('\n') + (lineIndex > 0 ? '\n' : '');
        fs.writeFileSync(filePath, remainingLines, 'utf8');
    }

    private rotateActiveSegment(): void {
        this.closeActiveSegment();
        this.activeSegmentIndex++;
        this.currentSegmentSize = 0;
    }

    private ensureActiveSegmentOpen(): void {
        if (this.activeFileHandle === null) {
            const fileName = `segment_${String(this.activeSegmentIndex).padStart(6, '0')}.log`;
            const filePath = path.join(this.walDir, fileName);
            this.activeFileHandle = fs.openSync(filePath, 'a+');
        }
    }

    public closeActiveSegment(): void {
        if (this.activeFileHandle !== null) {
            fs.closeSync(this.activeFileHandle);
            this.activeFileHandle = null;
        }
    }
}

/**
 * Atomic Snapshot Store
 * Prevents corrupted state checkpoints during crashes using write-rename pattern.
 */
export class AtomicSnapshotStore {
    private snapshotPath: string;

    constructor(dir: string, filename = 'snapshot.json') {
        this.snapshotPath = path.join(dir, filename);
    }

    /**
     * Writes state snapshot atomically using a temporary file and rename barrier.
     */
    public writeSnapshotAtomically<S>(snapshot: StateSnapshot<S>): void {
        const tempPath = this.snapshotPath + '.tmp';
        
        // Write snapshot to temporary file
        fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
        
        // Force physical sync of temporary file descriptor before renaming
        const fd = fs.openSync(tempPath, 'r+');
        fs.fsyncSync(fd);
        fs.closeSync(fd);

        // Atomic replace rename barrier
        fs.renameSync(tempPath, this.snapshotPath);
    }

    public readSnapshot<S>(): StateSnapshot<S> | null {
        if (!fs.existsSync(this.snapshotPath)) return null;
        try {
            const content = fs.readFileSync(this.snapshotPath, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            console.error('[SNAPSHOT::READ_ERR] Core snapshot corrupted or missing.');
            return null;
        }
    }
}
