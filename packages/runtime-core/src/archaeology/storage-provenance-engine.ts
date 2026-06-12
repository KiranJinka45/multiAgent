export type StorageConfidenceLevel = 'STRONG_PARITY' | 'ORDERING_AMBIGUITY' | 'PARTIAL_TORN_RISK' | 'FILESYSTEM_CORRUPT';

export interface StorageProvenanceReport {
    confidenceLevel: StorageConfidenceLevel;
    storageTruthConfidence: number; // 0.0 to 1.0 (percentage)
    unverifiableWindowMs: number;
    fsyncBarrierVerified: boolean;
    anomalies: string[];
}

export class StorageConfidenceProvenanceEngine {
    /**
     * Evaluates storage hardware write integrity, checksum mismatches,
     * delayed allocations, and classifies filesystem truth reliability.
     */
    public evaluateStorageProvenance(profile: {
        fsyncBarrierVerified: boolean;
        checksumMatch: boolean;
        writeOrderPreserved: boolean;
        unverifiableDelayMs: number;
        firmwareWarningDetected: boolean;
    }): StorageProvenanceReport {
        let confidenceLevel: StorageConfidenceLevel = 'STRONG_PARITY';
        let storageTruthConfidence = 1.0;
        const unverifiableWindowMs = profile.unverifiableDelayMs;
        const anomalies: string[] = [];

        // 1. Evaluate firmware warnings or severe corruptions
        if (profile.firmwareWarningDetected || !profile.checksumMatch) {
            confidenceLevel = 'FILESYSTEM_CORRUPT';
            storageTruthConfidence = 0.10;
            anomalies.push('Silent SSD firmware block corruption or raw block checksum mismatch detected');
        }

        // 2. Evaluate partial block/torn write risks
        else if (!profile.fsyncBarrierVerified && !profile.writeOrderPreserved) {
            confidenceLevel = 'PARTIAL_TORN_RISK';
            storageTruthConfidence = 0.45;
            anomalies.push('Fsync barriers unconfirmed and hardware write reordering detected (torn-write hazard)');
        }

        // 3. Evaluate ordering ambiguities
        else if (!profile.fsyncBarrierVerified || !profile.writeOrderPreserved) {
            confidenceLevel = 'ORDERING_AMBIGUITY';
            storageTruthConfidence = 0.75;
            anomalies.push('Fsync write barrier was unverified by storage controller driver');
        }

        // 4. Adjust confidence based on unverifiable delays
        if (profile.unverifiableDelayMs > 10000 && confidenceLevel === 'STRONG_PARITY') {
            confidenceLevel = 'ORDERING_AMBIGUITY';
            storageTruthConfidence = 0.85;
            anomalies.push(`Elevated uncommitted filesystem cache delay detected: ${profile.unverifiableDelayMs}ms`);
        }

        return {
            confidenceLevel,
            storageTruthConfidence: Math.round(storageTruthConfidence * 100) / 100,
            unverifiableWindowMs,
            fsyncBarrierVerified: profile.fsyncBarrierVerified,
            anomalies
        };
    }
}
