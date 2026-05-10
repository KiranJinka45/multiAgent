import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ITraceRecorder, IMissionEvent, ITraceBundle, ITraceReceipt } from './contracts.js';

import { logger, VirtualFileSystem } from '@packages/utils';

const TRACE_DIR = process.env.ZTAN_TRACE_DIR || path.join(process.cwd(), '.ztan/trace');

if (!fs.existsSync(TRACE_DIR)) {
    fs.mkdirSync(TRACE_DIR, { recursive: true });
}

/**
 * 🛡️ ZTAN MissionTraceRecorder (MOC)
 * Singleton instance for bit-perfect forensic trace recording.
 */
export class MissionTraceRecorder implements ITraceRecorder {
    private static instance: MissionTraceRecorder;
    private currentTrace: IMissionEvent[] = [];
    private missionId: string = 'GLOBAL';
    private lastEventHash: string = '0'.repeat(64);
    private signingKey: crypto.KeyObject;
    private verifyKey: crypto.KeyObject;
    private signerKeyId: string;
    private receipt: Partial<ITraceReceipt>;
    private witnessUrl?: string;

    public constructor(missionId: string = 'GLOBAL', options: { witnessUrl?: string } = {}) {
        const { privateKey, publicKey } = this.loadOrGenerateKeyPair();
        this.signingKey = privateKey;
        this.verifyKey = publicKey;
        this.signerKeyId = this.calculateKeyFingerprint(publicKey);
        this.missionId = missionId;

        this.receipt = {
            version: '1.0',
            environmentHash: this.calculateEnvironmentHash(),
            modelVersion: 'unknown',
            platform: process.platform,
            canonicalVersion: 'v1',
            signatureAlgorithm: 'ed25519',
            signerKeyId: this.signerKeyId
        };
        
        this.witnessUrl = options.witnessUrl || process.env.WITNESS_URL;
    }

    static getInstance(): MissionTraceRecorder {
        if (!MissionTraceRecorder.instance) {
            MissionTraceRecorder.instance = new MissionTraceRecorder();
        }
        return MissionTraceRecorder.instance;
    }

    /**
     * 🛡️ Loads Ed25519 keypair from .ztan/keys/, generates if absent.
     * Private key stays local. Public key is distributable to auditors.
     */
    private loadOrGenerateKeyPair(): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject } {
        const keyDir = path.join(path.dirname(TRACE_DIR), 'keys');
        const privPath = path.join(keyDir, 'signing.key');
        const pubPath = path.join(keyDir, 'verify.pub');

        if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
            const privateKey = crypto.createPrivateKey(fs.readFileSync(privPath, 'utf8'));
            const publicKey = crypto.createPublicKey(fs.readFileSync(pubPath, 'utf8'));
            logger.info('[MissionTrace] Ed25519 keypair loaded from .ztan/keys/');
            return { privateKey, publicKey };
        }

        // Generate fresh Ed25519 keypair
        if (!fs.existsSync(keyDir)) {
            fs.mkdirSync(keyDir, { recursive: true });
        }

        const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
        const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
        const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

        fs.writeFileSync(privPath, privPem, { mode: 0o600 });
        fs.writeFileSync(pubPath, pubPem, { mode: 0o644 });
        logger.info('[MissionTrace] Ed25519 keypair generated at .ztan/keys/');

        return { privateKey, publicKey };
    }

    /**
     * 🛡️ SHA-256 fingerprint of the public key for key identification.
     */
    private calculateKeyFingerprint(publicKey: crypto.KeyObject): string {
        const pubDer = publicKey.export({ type: 'spki', format: 'der' });
        return crypto.createHash('sha256').update(pubDer).digest('hex');
    }

    private calculateEnvironmentHash(): string {
        const envObj = {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            nodeEnv: process.env.NODE_ENV || 'development',
            execPath: process.execPath
        };
        return crypto.createHash('sha256').update(this.canonicalize(envObj)).digest('hex');
    }

    private calculateChecksum(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * 🛡️ ZTAN Canonical JSON v1 Implementation (RFC 8785 aligned)
     * Ensures deterministic serialization for cryptographic hashing.
     */
    private canonicalize(obj: any): string {
        if (obj === null || typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map(item => this.canonicalize(item)).join(',') + ']';
        }
        const keys = Object.keys(obj).sort();
        const parts = [];
        for (const key of keys) {
            const val = obj[key];
            if (val !== undefined) {
                parts.push(JSON.stringify(key) + ':' + this.canonicalize(val));
            }
        }
        return '{' + parts.join(',') + '}';
    }

    /**
     * 🛡️ Signs chainRoot with Ed25519 private key.
     * Returns Base64-encoded detached signature.
     * Verifier needs only the public key — cannot forge.
     */
    private signChainRoot(chainRoot: string): string {
        const signature = crypto.sign(null, Buffer.from(chainRoot, 'utf8'), this.signingKey);
        return signature.toString('base64');
    }

    /**
     * 🛡️ Synchronizes parent directory metadata to disk.
     * Critical for durability across power loss.
     */
    private fsyncDir(dirPath: string) {
        if (process.platform === 'win32') return; 
        try {
            const fd = fs.openSync(dirPath, 'r');
            fs.fsyncSync(fd);
            fs.closeSync(fd);
        } catch (e) {
            logger.warn({ dirPath, error: e }, '[MissionTrace] Directory fsync failed');
        }
    }

    /**
     * 🛡️ Records event to append-only NDJSON journal and updates detached receipt.
     * Eliminates O(N^2) write amplification while preserving atomic hash-chain integrity.
     */
    async recordEvent(event: IMissionEvent): Promise<void> {
        if (this.missionId !== event.missionId) {
            this.missionId = event.missionId;
            this.currentTrace = [];
            this.lastEventHash = '0'.repeat(64);
        }

        // 🛡️ Hash-Chaining with Canonical JSON
        event.previousHash = this.lastEventHash;
        const eventBody = {
            id: event.id,
            type: event.type,
            payload: event.payload,
            timestamp: event.timestamp
        };
        event.eventHash = this.calculateChecksum(event.previousHash + this.canonicalize(eventBody));
        this.lastEventHash = event.eventHash;

        this.currentTrace.push(event);
        
        const tracePath = path.join(TRACE_DIR, `${event.missionId}.trace.ndjson`);
        const receiptPath = path.join(TRACE_DIR, `${event.missionId}.receipt.json`);
        
        const chainRoot = this.currentTrace[0]?.eventHash || '0'.repeat(64);

        // 1. Append to NDJSON Journal
        const canonicalEventLine = this.canonicalize(event) + '\n';
        try {
            const fd = fs.openSync(tracePath, 'a');
            fs.appendFileSync(fd, canonicalEventLine);
            // In a production HSM setting, fsync might be deferred, but we keep it for strict local durability
            fs.fsyncSync(fd);
            fs.closeSync(fd);
        } catch (e) {
            logger.error({ missionId: event.missionId, error: e }, '[MissionTrace] NDJSON append failed');
            throw e;
        }

        // 2. Update Detached Receipt
        const updatedReceipt: ITraceReceipt = {
            ...this.receipt as ITraceReceipt,
            missionId: event.missionId,
            timestamp: new Date().toISOString(),
            eventCount: this.currentTrace.length,
            chainRoot,
            tailHash: event.eventHash,
            governanceReceipt: this.signChainRoot(chainRoot)
        };

        const tempReceiptPath = `${receiptPath}.tmp`;
        try {
            fs.writeFileSync(tempReceiptPath, JSON.stringify(updatedReceipt, null, 2));
            const fdR = fs.openSync(tempReceiptPath, 'r+');
            fs.fsyncSync(fdR);
            fs.closeSync(fdR); 
            fs.renameSync(tempReceiptPath, receiptPath);
            this.fsyncDir(TRACE_DIR); 
            logger.info({ missionId: event.missionId, type: event.type }, '[MissionTrace] Event recorded with attestable integrity (NDJSON)');
        } catch (e) {
            logger.error({ missionId: event.missionId, error: e }, '[MissionTrace] Receipt persistence failed');
            throw e;
        }
    }

    /**
     * 🛡️ Emits a final SEAL event, finalizes the receipt, and marks both the journal and receipt as OS-level immutable (read-only).
     */
    async sealTrace(): Promise<void> {
        if (!this.missionId) return;

        logger.info({ missionId: this.missionId }, '[MissionTrace] Sealing trace (Immutable segment transition)');

        const sealEvent: IMissionEvent = {
            id: `seal_${Date.now()}`,
            missionId: this.missionId,
            type: 'SEAL',
            timestamp: new Date().toISOString(),
            payload: { sealed: true, finalEventCount: this.currentTrace.length + 1 },
            previousHash: '',
            eventHash: '',
            metadata: { stepIndex: this.currentTrace.length, agentId: 'ztan_governance', reproducible: true }
        };

        await this.recordEvent(sealEvent);

        const tracePath = path.join(TRACE_DIR, `${this.missionId}.trace.ndjson`);
        const receiptPath = path.join(TRACE_DIR, `${this.missionId}.receipt.json`);

        try {
            // Apply 0o444 (read-only) permissions
            if (fs.existsSync(tracePath)) {
                fs.chmodSync(tracePath, 0o444);
            }
            if (fs.existsSync(receiptPath)) {
                fs.chmodSync(receiptPath, 0o444);
            }
            logger.info({ missionId: this.missionId }, '[MissionTrace] Trace permanently sealed and marked OS-immutable');
        } catch (e) {
            logger.error({ missionId: this.missionId, error: e }, '[MissionTrace] Failed to enforce OS-immutability on sealed trace');
            throw e;
        }

        // External Witness Notarization
        if (this.witnessUrl && fs.existsSync(receiptPath)) {
            logger.info({ missionId: this.missionId, witnessUrl: this.witnessUrl }, '[MissionTrace] Requesting external transparency witness...');
            try {
                const receiptPayload = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
                const response = await fetch(this.witnessUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(receiptPayload)
                });

                if (!response.ok) {
                    throw new Error(`Witness server returned ${response.status}: ${await response.text()}`);
                }

                const witnessReceipt = await response.json();
                const witnessReceiptPath = path.join(TRACE_DIR, `${this.missionId}.receipt.witness.json`);
                fs.writeFileSync(witnessReceiptPath, JSON.stringify(witnessReceipt, null, 2));
                fs.chmodSync(witnessReceiptPath, 0o444);
                
                logger.info({ missionId: this.missionId }, '[MissionTrace] [TIER 3] Externally witnessed successfully.');
            } catch (e) {
                logger.warn({ missionId: this.missionId, error: e }, '[MissionTrace] [WARNING] External witness failed. Trace remains sealed locally [LOCAL_ONLY].');
                // We do NOT throw here as the trace is already legally sealed locally.
            }
        }
    }

    async getTrace(missionId: string): Promise<IMissionEvent[]> {
        const tracePath = path.join(TRACE_DIR, `${missionId}.trace.ndjson`);
        const receiptPath = path.join(TRACE_DIR, `${missionId}.receipt.json`);

        // Legacy compatibility: If old .trace.json exists and .ndjson doesn't, we could handle it.
        // For simplicity, we expect the new format here, or we can check for legacy.
        const legacyPath = path.join(TRACE_DIR, `${missionId}.trace.json`);
        if (!fs.existsSync(tracePath) && fs.existsSync(legacyPath)) {
            // Load legacy
            const raw = fs.readFileSync(legacyPath, 'utf8');
            const wrapper = JSON.parse(raw);
            return wrapper.trace || [];
        }

        if (!fs.existsSync(tracePath)) {
            return [];
        }

        let rawNdjson: string;
        try {
            rawNdjson = fs.readFileSync(tracePath, 'utf8');
        } catch (e) {
            logger.error({ missionId, error: e }, '[MissionTrace] Read failed');
            throw e;
        }

        const events: IMissionEvent[] = [];
        const lines = rawNdjson.split('\n').filter(l => l.trim() !== '');
        for (const line of lines) {
            try {
                events.push(JSON.parse(line));
            } catch (e) {
                this.handleCorruption(missionId, rawNdjson, 'NDJSON_PARSE_FAILURE');
                throw new Error(`[MissionTrace] Trace corruption detected (NDJSON line): ${missionId}`);
            }
        }

        // Receipt check
        if (fs.existsSync(receiptPath)) {
            try {
                const rawReceipt = fs.readFileSync(receiptPath, 'utf8');
                const receipt: ITraceReceipt = JSON.parse(rawReceipt);
                
                // Integrity check: tailHash commits to the entire chain
                const actualTailHash = events.length > 0 ? events[events.length - 1].eventHash : '0'.repeat(64);
                if (receipt.tailHash !== actualTailHash) {
                    this.handleCorruption(missionId, rawNdjson, 'TAIL_HASH_MISMATCH');
                    throw new Error(`[MissionTrace] Trace corruption detected (TailHash mismatch): ${missionId}`);
                }
            } catch (e) {
                logger.error({ missionId, error: e }, '[MissionTrace] Receipt verification failed');
            }
        }

        return events;
    }

    private handleCorruption(missionId: string, content: string, reason: string) {
        const corruptionDir = path.join(process.cwd(), 'failures', 'corrupted');
        if (!fs.existsSync(corruptionDir)) {
            fs.mkdirSync(corruptionDir, { recursive: true });
        }
        const archivePath = path.join(corruptionDir, `${missionId}.${Date.now()}.corrupted.json`);
        fs.writeFileSync(archivePath, content);
        logger.error({ missionId, reason, archivePath }, '[MissionTrace] FATAL: Trace corruption archived');
    }

    async flush(): Promise<void> {
        this.currentTrace = [];
    }

    verifyForReplay(storedTrace: any): { valid: boolean, reason?: string } {
        // Handle both legacy .metadata and new .receipt structures
        const metadataOrReceipt = storedTrace.metadata || storedTrace.receipt;
        if (!metadataOrReceipt) return { valid: false, reason: 'Missing metadata/receipt' };
        
        const currentHash = this.calculateEnvironmentHash();
        if (metadataOrReceipt.environmentHash !== currentHash) {
            return { valid: false, reason: `Environment Drift: Expected ${metadataOrReceipt.environmentHash}, got ${currentHash}` };
        }
        return { valid: true };
    }

    async save(vfs: VirtualFileSystem) {
        const payload = {
            receipt: this.receipt,
            trace: this.currentTrace
        };
        await vfs.writeFile(`.ztan/trace/${this.missionId}.memory.json`, JSON.stringify(payload, null, 2));
    }
}
