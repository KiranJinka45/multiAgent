import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const LEDGER_DIR = path.join(process.cwd(), '.ztan-transparency');
const LEDGER_FILE = path.join(LEDGER_DIR, 'audit_ledger.json');

function ensureDirExists() {
    if (!fs.existsSync(LEDGER_DIR)) {
        fs.mkdirSync(LEDGER_DIR, { recursive: true });
    }
}

export interface LedgerEntry {
    id: unknown;
    entryId: string;
    timestamp: number;
    eventType: 'PROPOSAL_RECEIVED' | 'INSPECTION_FAILED' | 'LATTICE_DENIED' | 'SIMULATION_BLOCKED' | 'ESCALATION_TRIGGERED' | 'OPA_DENIED' | 'EXECUTION_STARTED' | 'EXECUTION_COMPLETED' | 'ISOLATION_FAULT' | 'LLM_TRANSACTION_LOG';
    tenantId: string;
    evidenceHash: string;
    details: Record<string, string | number | boolean>;
    witnessSignature?: string;
    timestampToken?: string;
    rekorIndex?: number;
    previousHash?: string;
}

export class GovernanceLedger {
    private static entries: LedgerEntry[] = [];
    private static rollingHash: string = crypto.createHash('sha256').update('GENESIS').digest('hex');
    private static compactedCount = 0;
    private static quarantined = false;
    private static isLoaded = false;

    private static loadFromFile(): void {
        if (this.isLoaded) return;
        try {
            ensureDirExists();
            if (fs.existsSync(LEDGER_FILE)) {
                const raw = fs.readFileSync(LEDGER_FILE, 'utf8');
                const data = JSON.parse(raw);
                this.entries = data.entries || [];
                this.rollingHash = data.rollingHash || crypto.createHash('sha256').update('GENESIS').digest('hex');
                this.compactedCount = data.compactedCount || 0;
                this.quarantined = data.quarantined || false;
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[AUDIT_LEDGER] Failed to load ledger from file: ${message}`);
        } finally {
            this.isLoaded = true;
        }
    }

    private static saveToFile(): void {
        try {
            ensureDirExists();
            const data = {
                entries: this.entries,
                rollingHash: this.rollingHash,
                compactedCount: this.compactedCount,
                quarantined: this.quarantined
            };
            fs.writeFileSync(LEDGER_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[AUDIT_LEDGER] Failed to save ledger to file: ${message}`);
        }
    }

    static setQuarantined(state: boolean): void {
        this.loadFromFile();
        this.quarantined = state;
        this.saveToFile();
    }

    static isQuarantined(): boolean {
        this.loadFromFile();
        return this.quarantined;
    }

    static append(
        eventType: LedgerEntry['eventType'],
        tenantId: string,
        evidenceHash: string,
        details: Record<string, string | number | boolean>,
        witnessSignature?: string,
        timestampToken?: string,
        rekorIndex?: number
    ): string {
        this.loadFromFile();
        if (this.quarantined) {
            throw new Error('LEDGER_LOCKDOWN: Ledger appends are blocked due to quarantine state');
        }

        // Strict redaction of any field named 'prompt', 'raw', or 'payload' if it leaks into details
        const safeDetails = { ...details };
        delete safeDetails['prompt'];
        delete safeDetails['raw'];
        delete safeDetails['payload'];
        delete safeDetails['credential'];

        const previousHash = this.rollingHash;

        // Calculate cryptographic block ID derived from the rolling SHA-256 chain
        const nextRollingHash = crypto.createHash('sha256')
            .update(previousHash + eventType + tenantId + evidenceHash + JSON.stringify(safeDetails) + (witnessSignature || ''))
            .digest('hex');

        const entryId = `gL-${nextRollingHash}`;

        const entry: LedgerEntry = {
            entryId,
            timestamp: Date.now(),
            eventType,
            tenantId,
            evidenceHash,
            details: safeDetails,
            witnessSignature,
            timestampToken,
            rekorIndex,
            previousHash,
            id: undefined
        };

        this.entries.push(entry);
        this.rollingHash = nextRollingHash;

        this.saveToFile();
        return entryId;
    }

    static validateChainIntegrity(): boolean {
        this.loadFromFile();
        
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            
            if (i > 0) {
                const prevEntry = this.entries[i - 1];
                const expectedPrevHash = prevEntry.entryId.replace('gL-', '');
                if (entry.previousHash !== expectedPrevHash) {
                    console.error(`[AUDIT_LEDGER] Integrity violation at entry ${entry.entryId}: previousHash mismatch.`);
                    process.exit(1);
                }
            }

            const computedHash = crypto.createHash('sha256')
                .update((entry.previousHash || '') + entry.eventType + entry.tenantId + entry.evidenceHash + JSON.stringify(entry.details) + (entry.witnessSignature || ''))
                .digest('hex');

            if (entry.entryId !== `gL-${computedHash}`) {
                console.error(`[AUDIT_LEDGER] Integrity violation: entryId ${entry.entryId} does not match computed hash ${computedHash}`);
                process.exit(1);
            }
        }

        if (this.entries.length > 0) {
            const lastEntry = this.entries[this.entries.length - 1];
            const expectedRollingHash = lastEntry.entryId.replace('gL-', '');
            if (this.rollingHash !== expectedRollingHash) {
                console.error('[AUDIT_LEDGER] Integrity violation: rollingHash mismatch with last entry.');
                process.exit(1);
            }
        }

        return true;
    }

    static compact(keepCount: number = 100): void {
        this.loadFromFile();
        if (this.entries.length <= keepCount) return;
        const toCompact = this.entries.length - keepCount;
        this.compactedCount += toCompact;
        this.entries = this.entries.slice(toCompact);
        this.saveToFile();
    }

    static getRollingHash(): string {
        this.loadFromFile();
        return this.rollingHash;
    }

    static getCompactedCount(): number {
        this.loadFromFile();
        return this.compactedCount;
    }

    static getEntries(): readonly LedgerEntry[] {
        this.loadFromFile();
        return this.entries;
    }

    static clearForTesting(): void {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                '[LEDGER_SAFETY] clearForTesting() is BLOCKED in production. ' +
                'This method destroys the entire audit ledger and must never execute in production.'
            );
        }

        this.entries = [];
        this.rollingHash = crypto.createHash('sha256').update('GENESIS').digest('hex');
        this.compactedCount = 0;
        this.quarantined = false;
        try {
            if (fs.existsSync(LEDGER_FILE)) {
                fs.unlinkSync(LEDGER_FILE);
            }
        } catch (_e: unknown) {
            // ignore
        }
        this.isLoaded = false;
    }
}
