export interface ArchaeologyReport {
    isValid: boolean;
    issues: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reconciliationAction?: string;
}

export interface DivergenceReport {
    isDiverged: boolean;
    lagBytes: number;
    timelineMismatch: boolean;
    reconciliationState: 'CLEAN' | 'OUT_OF_SYNC' | 'REWINNING_REQUIRED';
}

export interface SlotReport {
    exhaustionPercent: number;
    activeSlots: number;
    maxSlots: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PreparedTxReport {
    leakedCount: number;
    oldestTxAgeSeconds: number;
    requiresManualRollback: boolean;
    abandonedXids: string[];
}

export interface XidWraparoundReport {
    currentXidAge: number;
    percentToWraparound: number;
    autovacuumEmergencyActive: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class PostgresPhysicalArchaeologist {
    private maxSlots: number;
    private xidWraparoundLimit: number = 2000000000;

    constructor(maxSlots: number = 10) {
        this.maxSlots = maxSlots;
    }

    /**
     * Inspects a WAL file buffer for byte corruption, checksum mismatches, or header alignment issues.
     */
    public diagnoseWalCorruption(walPath: string, buffer: Buffer): ArchaeologyReport {
        const issues: string[] = [];
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        let reconciliationAction: string | undefined;

        if (buffer.length < 8) {
            issues.push('WAL file is truncated or header is missing');
            riskLevel = 'CRITICAL';
            reconciliationAction = 'RESTORE_FROM_ARCHIVE';
        } else {
            // Read magic bytes (simulated Postgres WAL magic `0xD071`)
            const magic = buffer.readUInt16BE(0);
            if (magic !== 0xD071 && magic !== 0x71D0) {
                issues.push(`Invalid WAL magic header: 0x${magic.toString(16).toUpperCase()}`);
                riskLevel = 'CRITICAL';
                reconciliationAction = 'RECONSTRUCT_WAL_TIMELINE';
            }

            // Verify checksum bit pattern
            const checksum = buffer.readUInt32BE(4);
            let calculated = 0;
            for (let i = 8; i < buffer.length; i++) {
                calculated = (calculated + buffer[i]) & 0xFFFFFFFF;
            }

            if (checksum !== 0 && checksum !== calculated) {
                issues.push(`WAL block checksum mismatch. Stored: ${checksum}, Calculated: ${calculated}`);
                riskLevel = 'HIGH';
                reconciliationAction = 'STANDBY_REPLICA_RESYNC';
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
            riskLevel,
            reconciliationAction
        };
    }

    /**
     * Calculates replica replication lag and timeline splits.
     */
    public simulateReplicaDivergence(
        masterLsn: string,
        replicaLsn: string,
        masterTimeline: number = 1,
        replicaTimeline: number = 1
    ): DivergenceReport {
        const masterParsed = this.parseLsn(masterLsn);
        const replicaParsed = this.parseLsn(replicaLsn);
        const lagBytes = Math.max(0, Number(masterParsed - replicaParsed));
        
        const timelineMismatch = masterTimeline !== replicaTimeline;
        let reconciliationState: 'CLEAN' | 'OUT_OF_SYNC' | 'REWINNING_REQUIRED' = 'CLEAN';

        if (timelineMismatch) {
            reconciliationState = 'REWINNING_REQUIRED';
        } else if (lagBytes > 1024 * 1024 * 64) { // > 64MB lag
            reconciliationState = 'OUT_OF_SYNC';
        }

        return {
            isDiverged: lagBytes > 0 || timelineMismatch,
            lagBytes,
            timelineMismatch,
            reconciliationState
        };
    }

    /**
     * Audits replication slot depletion metrics and storage footprint growth.
     */
    public checkReplicationSlots(activeSlotCount: number): SlotReport {
        const exhaustionPercent = (activeSlotCount / this.maxSlots) * 100;
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

        if (exhaustionPercent >= 90) {
            riskLevel = 'CRITICAL';
        } else if (exhaustionPercent >= 70) {
            riskLevel = 'HIGH';
        } else if (exhaustionPercent >= 40) {
            riskLevel = 'MEDIUM';
        }

        return {
            exhaustionPercent,
            activeSlots: activeSlotCount,
            maxSlots: this.maxSlots,
            riskLevel
        };
    }

    /**
     * Detects long-lived prepared 2PC transactions blocking autovacuum and table locks.
     */
    public checkPreparedTransactions(
        preparedTxList: Array<{ xid: string; ageSeconds: number }>
    ): PreparedTxReport {
        const abandonedXids: string[] = [];
        let oldestTxAgeSeconds = 0;

        for (const tx of preparedTxList) {
            if (tx.ageSeconds > oldestTxAgeSeconds) {
                oldestTxAgeSeconds = tx.ageSeconds;
            }
            if (tx.ageSeconds > 3600) { // older than 1 hour is abandoned
                abandonedXids.push(tx.xid);
            }
        }

        return {
            leakedCount: preparedTxList.length,
            oldestTxAgeSeconds,
            requiresManualRollback: abandonedXids.length > 0,
            abandonedXids
        };
    }

    /**
     * Monitors transaction ID (XID) age to prevent database wraparound shutdown.
     */
    public evaluateXidWraparound(currentXidAge: number): XidWraparoundReport {
        const percentToWraparound = (currentXidAge / this.xidWraparoundLimit) * 100;
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        let autovacuumEmergencyActive = false;

        if (currentXidAge > 1800000000) { // 1.8 billion
            riskLevel = 'CRITICAL';
            autovacuumEmergencyActive = true;
        } else if (currentXidAge > 1500000000) { // 1.5 billion
            riskLevel = 'HIGH';
            autovacuumEmergencyActive = true;
        } else if (currentXidAge > 200000000) { // 200 million (PG autovacuum_freeze_max_age default)
            riskLevel = 'MEDIUM';
            autovacuumEmergencyActive = true;
        }

        return {
            currentXidAge,
            percentToWraparound: Math.round(percentToWraparound * 100) / 100,
            autovacuumEmergencyActive,
            riskLevel
        };
    }

    /**
     * Inspects raw database block pages for torn-writes or null-padding corruption.
     */
    public checkTornPage(pageBuffer: Buffer): { isCorrupted: boolean; isTorn: boolean; isNullPadded: boolean } {
        if (pageBuffer.length < 8192) {
            // Standard Postgres page size is 8KB
            return { isCorrupted: true, isTorn: false, isNullPadded: false };
        }

        // A page is null padded if it is all zeros
        let isAllZeros = true;
        for (let i = 0; i < pageBuffer.length; i++) {
            if (pageBuffer[i] !== 0) {
                isAllZeros = false;
                break;
            }
        }
        if (isAllZeros) {
            return { isCorrupted: true, isTorn: false, isNullPadded: true };
        }

        // Standard Postgres PageHeaderData contains page layout offsets:
        // pd_lower (2 bytes) and pd_upper (2 bytes) at offsets 12 and 14.
        // A torn write typically results in inconsistent header offsets.
        const pdLower = pageBuffer.readUInt16LE(12);
        const pdUpper = pageBuffer.readUInt16LE(14);

        const isTorn = pdLower > pdUpper || pdLower > 8192 || pdUpper > 8192 || pdLower === 0;

        return {
            isCorrupted: isTorn,
            isTorn,
            isNullPadded: false
        };
    }

    /**
     * Parses simple LSN string (e.g. "0/16A2F40") to numeric offset for lag comparisons.
     */
    private parseLsn(lsn: string): bigint {
        const parts = lsn.split('/');
        if (parts.length !== 2) return 0n;
        const fileId = BigInt(parseInt(parts[0], 16));
        const offset = BigInt(parseInt(parts[1], 16));
        return (fileId << 32n) + offset;
    }
}
