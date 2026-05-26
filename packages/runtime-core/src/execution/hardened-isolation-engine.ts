export type HypervisorBoundary = 'Firecracker' | 'gVisor' | 'Kata' | 'None';

export interface HardenedIsolationProfile {
    namespaceIsolation: boolean;       // Mount and network namespaces active
    overlayFsImmutable: boolean;       // Immutable root overlay filesystem
    hypervisorBoundary: HypervisorBoundary; // Virtualization boundary
    seccompBpfActive: boolean;         // Real BPF syscall auditing active
}

export interface HardenedIsolationReport {
    isolationSecurityScore: number;    // Score from 0.0 to 1.0
    isHighlyIsolated: boolean;          // Is the score >= threshold?
    quarantineTriggered: boolean;      // True if a critical vulnerability is detected or score < threshold
    violations: string[];
}

export class HardenedIsolationEngine {
    private quarantineThreshold: number;

    constructor(quarantineThreshold = 0.80) {
        this.quarantineThreshold = quarantineThreshold;
    }

    /**
     * Evaluates a kernel-level isolation profile, computes a normalized security score,
     * audits boundary violations, and triggers a quarantine on boundary breaches.
     */
    public evaluateIsolationSecurity(profile: HardenedIsolationProfile): HardenedIsolationReport {
        const violations: string[] = [];
        let quarantineTriggered = false;
        let score = 0.0;

        // 1. Evaluate namespace isolation (Weight: 0.25)
        if (profile.namespaceIsolation) {
            score += 0.25;
        } else {
            violations.push('Mount/network namespace isolation is inactive or bypassed');
            quarantineTriggered = true;
        }

        // 2. Evaluate immutable overlay filesystem (Weight: 0.25)
        if (profile.overlayFsImmutable) {
            score += 0.25;
        } else {
            violations.push('Root filesystem overlayfs is mutable (write protection bypassed)');
            quarantineTriggered = true;
        }

        // 3. Evaluate seccomp-bpf filters (Weight: 0.20)
        if (profile.seccompBpfActive) {
            score += 0.20;
        } else {
            violations.push('Seccomp BPF filters are inactive (raw syscall restrictions disabled)');
            // Lack of seccomp is a violation, but we might want to also trigger quarantine
            // if we are being extremely defensive. Let's mark quarantineTriggered if score falls low.
        }

        // 4. Evaluate virtualization hypervisor boundaries (Weight: 0.30)
        switch (profile.hypervisorBoundary) {
            case 'Firecracker':
            case 'Kata':
                score += 0.30;
                break;
            case 'gVisor':
                score += 0.20;
                break;
            case 'None':
                violations.push('Hypervisor-grade virtualization boundary is absent (running on bare metal / shared container)');
                quarantineTriggered = true;
                break;
            default:
                violations.push(`Unknown hypervisor boundary type: "${profile.hypervisorBoundary}"`);
                quarantineTriggered = true;
                break;
        }

        // Standardize score to two decimal places
        const finalScore = Math.round(score * 100) / 100;
        const isHighlyIsolated = finalScore >= this.quarantineThreshold;

        // If score is below threshold, trigger quarantine as well
        if (finalScore < this.quarantineThreshold) {
            quarantineTriggered = true;
            violations.push(`Isolation security score ${finalScore} is below required quarantine threshold of ${this.quarantineThreshold}`);
        }

        return {
            isolationSecurityScore: finalScore,
            isHighlyIsolated,
            quarantineTriggered,
            violations
        };
    }
}
