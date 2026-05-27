import { 
    SimulatedReplicationTransport
} from './replicated-wal.js';
import type { ReplicationMessage } from './replicated-wal.js';
import { DurableSegmentedWal } from './durable-wal.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class AdversarialReplicationTransport extends SimulatedReplicationTransport {
    private asymmetricPartitions = new Set<string>(); // Set of "fromNodeId->toNodeId"
    private dropProbability = 0;
    private duplicationProbability = 0;
    private minJitterMs = 0;
    private maxJitterMs = 0;

    public injectAsymmetricPartition(fromNode: string, toNode: string): void {
        this.asymmetricPartitions.add(`${fromNode}->${toNode}`);
    }

    public removeAsymmetricPartition(fromNode: string, toNode: string): void {
        this.asymmetricPartitions.delete(`${fromNode}->${toNode}`);
    }

    public setDropProbability(probability: number): void {
        this.dropProbability = probability;
    }

    public setDuplicationProbability(probability: number): void {
        this.duplicationProbability = probability;
    }

    public setJitter(minMs: number, maxMs: number): void {
        this.minJitterMs = minMs;
        this.maxJitterMs = maxMs;
    }

    public override async send(targetNodeId: string, msg: ReplicationMessage): Promise<ReplicationMessage> {
        const sourceId = msg.senderId;

        // 1. Check Asymmetric Partition
        if (this.asymmetricPartitions.has(`${sourceId}->${targetNodeId}`)) {
            throw new Error(`[ADVERSARIAL::PARTITION] Unidirectional partition dropping packets from ${sourceId} to ${targetNodeId}`);
        }

        // 2. Check Random Packet Dropping
        if (Math.random() < this.dropProbability) {
            throw new Error(`[ADVERSARIAL::DROP] Randomly dropped replication packet from ${sourceId} to ${targetNodeId}`);
        }

        // 3. Simulate Jitter/Latency
        if (this.maxJitterMs > this.minJitterMs) {
            const delay = this.minJitterMs + Math.random() * (this.maxJitterMs - this.minJitterMs);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // 4. Simulate Packet Duplication (sends twice but only returns first response to caller)
        if (Math.random() < this.duplicationProbability) {
            super.send(targetNodeId, JSON.parse(JSON.stringify(msg))).catch(() => {});
        }

        return await super.send(targetNodeId, msg);
    }
}

export class AdversarialWalDecorator<E = any> {
    private fsyncDelayMs = 0;

    constructor(private readonly rawWal: DurableSegmentedWal<E>) {}

    public setFsyncDelay(delayMs: number): void {
        this.fsyncDelayMs = delayMs;
    }

    public getRawWal(): DurableSegmentedWal<E> {
        return this.rawWal;
    }

    public async appendWithJitter(payload: E): Promise<any> {
        const block = this.rawWal.append(payload);
        if (this.fsyncDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, this.fsyncDelayMs));
        }
        return block;
    }

    /**
     * Forcefully corrupts a segment file at a specific line length to simulate partial crash/bit rot
     */
    public corruptSegmentFile(segmentIndex: number, truncateToBytes: number): void {
        const walDir = this.rawWal.getWalDir();
        const fileName = `segment_${segmentIndex}.log`;
        const filePath = path.join(walDir, fileName);

        if (fs.existsSync(filePath)) {
            const fd = fs.openSync(filePath, 'r+');
            fs.ftruncateSync(fd, truncateToBytes);
            fs.closeSync(fd);
            console.log(`[ADVERSARIAL::WAL] Forcefully truncated segment ${fileName} to ${truncateToBytes} bytes to trigger recovery checks.`);
        }
    }
}
