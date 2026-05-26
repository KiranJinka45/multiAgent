export interface EnvironmentalFingerprint {
    packageGraphFingerprint: string;
    libcHash: string;
    kernelVersion: string;
    pgMinorVersion: string;
    vmConfigurationLineage: string;
    timestamp: number;
}

export interface ReproducibilityReport {
    isFullyReproducible: boolean;
    similarityIndex: number; // 0.0 to 1.0
    divergenceWarnings: string[];
}

export class EnvironmentalReproducibilityArchaeologist {
    private savedFingerprints = new Map<string, EnvironmentalFingerprint>();

    /**
     * Captures a fingerprint of the current environment configuration.
     */
    public captureCurrentFingerprint(
        packageGraphFingerprint: string,
        libcHash: string,
        kernelVersion: string,
        pgMinorVersion: string,
        vmConfigurationLineage = 'Standard.VM.Profile'
    ): EnvironmentalFingerprint {
        return {
            packageGraphFingerprint,
            libcHash,
            kernelVersion,
            pgMinorVersion,
            vmConfigurationLineage,
            timestamp: Date.now()
        };
    }

    /**
     * Registers a baseline environmental fingerprint for a historical incident trace.
     */
    public saveBaselineFingerprint(incidentId: string, fingerprint: EnvironmentalFingerprint): void {
        this.savedFingerprints.set(incidentId, fingerprint);
    }

    /**
     * Audits modern replay environment against historical incident baseline environmental fingerprint.
     * Generates a divergence report highlighting version shifts that compromise execution determinism.
     */
    public auditEnvironmentalReproducibility(
        incidentId: string, 
        currentEnv: EnvironmentalFingerprint
    ): ReproducibilityReport {
        const baseline = this.savedFingerprints.get(incidentId);
        if (!baseline) {
            return {
                isFullyReproducible: false,
                similarityIndex: 0.0,
                divergenceWarnings: [`Baseline environmental fingerprint for incident '${incidentId}' is unavailable.`]
            };
        }

        let similarityIndex = 1.0;
        const divergenceWarnings: string[] = [];

        // 1. Check NPM package dependency tree graph
        if (baseline.packageGraphFingerprint !== currentEnv.packageGraphFingerprint) {
            similarityIndex -= 0.35;
            divergenceWarnings.push('Supply-chain mismatch: NPM package graph dependency tree changes detected. Deterministic path execution compromised.');
        }

        // 2. Check System OS libc library mismatch
        if (baseline.libcHash !== currentEnv.libcHash) {
            similarityIndex -= 0.30;
            divergenceWarnings.push('OS level mismatch: system glibc binary hash change detected. Lower level thread scheduling or memory allocations may diverge.');
        }

        // 3. Check PostgreSQL minor engine version
        if (baseline.pgMinorVersion !== currentEnv.pgMinorVersion) {
            similarityIndex -= 0.20;
            divergenceWarnings.push(`Database engine mismatch: historical baseline used PG version ${baseline.pgMinorVersion}, but current is PG version ${currentEnv.pgMinorVersion}. WAL replay or index optimizer paths may differ.`);
        }

        // 4. Check Linux kernel version
        if (baseline.kernelVersion !== currentEnv.kernelVersion) {
            similarityIndex -= 0.15;
            divergenceWarnings.push(`Kernel scheduler mismatch: baseline used kernel ${baseline.kernelVersion}, but current is kernel ${currentEnv.kernelVersion}.`);
        }

        similarityIndex = Math.max(0.0, Math.round(similarityIndex * 100) / 100);
        const isFullyReproducible = similarityIndex === 1.0;

        return {
            isFullyReproducible,
            similarityIndex,
            divergenceWarnings
        };
    }
}
