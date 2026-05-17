/**
 * ZTAN HSM-Vault Simulation (Constitutional Appliance)
 * 
 * DESIGN RULE: This vault is "cryptographically stupid." 
 * It only knows how to sign, verify, and track epochs.
 * It does NOT interpret policy or generate human narratives.
 */
export enum HSMErrorCode {
    SUCCESS = 'SUCCESS',
    EPOCH_EXPIRED = 'EPOCH_EXPIRED',
    INVALID_QUORUM = 'INVALID_QUORUM',
    SIGNATURE_FAILED = 'SIGNATURE_FAILED',
    SNAPSHOT_STALE = 'SNAPSHOT_STALE'
}

export interface HSMAttestation {
    signature: string;
    epoch: number;
    timestamp: number;
}

export interface HSMState {
    currentEpoch: number;
    activeSigners: string[];
    snapshotHash: string;
    lastSnapshotTs: number;
}

export class HSMVault {
    private state: HSMState;
    private SNAPSHOT_TTL = 60000; // 60 seconds

    constructor(initialSigners: string[]) {
        this.state = {
            currentEpoch: 100,
            activeSigners: initialSigners,
            snapshotHash: 'initial-snapshot-hash',
            lastSnapshotTs: Date.now()
        };
    }

    public async attest(payload: string): Promise<HSMAttestation> {
        // Deterministic attestation based on current epoch state
        return {
            signature: `sig|${this.state.currentEpoch}|${payload}`,
            epoch: this.state.currentEpoch,
            timestamp: Date.now()
        };
    }

    public async verify(sig: string, payload: string, epochAtSigning: number): Promise<{ valid: boolean; errorCode?: HSMErrorCode }> {
        // Rule: Authority Freshness is checked at the higher layer.
        // The HSM only checks if the signature matches the expected format for that epoch.
        const expected = `sig|${epochAtSigning}|${payload}`;
        
        if (sig !== expected) {
            return { valid: false, errorCode: HSMErrorCode.SIGNATURE_FAILED };
        }

        return { valid: true, errorCode: HSMErrorCode.SUCCESS };
    }

    public async rotateEpoch(newSigners: string[]): Promise<{ epoch: number; status: string }> {
        this.state.currentEpoch += 1;
        this.state.activeSigners = newSigners;
        this.state.lastSnapshotTs = Date.now();
        this.state.snapshotHash = `hash|${this.state.currentEpoch}|${newSigners.join(',')}`;

        return {
            epoch: this.state.currentEpoch,
            status: 'ACTIVE'
        };
    }

    public getEpochState(): HSMState {
        return { ...this.state };
    }

    /**
     * Internal check for freshness - higher layers will use this to trigger SAFE_MODE
     */
    public isSnapshotFresh(): boolean {
        return (Date.now() - this.state.lastSnapshotTs) < this.SNAPSHOT_TTL;
    }
}
