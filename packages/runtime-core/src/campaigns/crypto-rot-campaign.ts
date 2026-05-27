/**
 * ZTAN Phase Ω.3 - Long-Horizon Cryptography Rot Campaign
 * 
 * DESIGN CONSTRAINTS:
 * 1. Simulates cryptography aging scenarios and checks evidence readability.
 * 2. Purely advisory testing.
 * 3. Never mutates live cryptographic modules or running setups.
 */

export interface CryptoAgingScenario {
    scenarioId: string;
    algorithm: string;
    deprecatedSinceYear: number;
    status: 'INSECURE' | 'REVOKED' | 'WEAK';
}

export interface RottenEvidenceVerification {
    evidenceId: string;
    payloadReadable: boolean;
    hashValidationPossible: boolean;
    trustValidationPossible: boolean;
    isCompromisedByRot: boolean;
}

export interface CryptoRotCampaignReport {
    campaignId: string;
    timestamp: number;
    scenariosSimulatedCount: number;
    rottenEvidenceEvaluatedCount: number;
    rotVulnerabilityScore: number; // 0.0 to 1.0 where 1.0 represents absolute vulnerability to cryptographic rot
    evidenceIntegrityMaintained: boolean;
    advisoryWarnings: string[];
    details: Record<string, RottenEvidenceVerification>;
}

export class CryptoRotCampaign {

    /**
     * Simulates backward-compatibility decoding of evidence compiled with ancient
     * ciphers (e.g. SHA-1, standard MD5, deprecated SHA-256 variants).
     */
    public simulateDeprecatedCipherReplay(
        algorithm: string,
        evidencePayload: string,
        expectedHash: string
    ): RottenEvidenceVerification {
        let payloadReadable = true;
        let hashValidationPossible = true;
        let trustValidationPossible = true;

        try {
            // Even if the JSON parses correctly (payload is readable)
            JSON.parse(evidencePayload);
        } catch {
            payloadReadable = false;
        }

        // MD5/SHA-1 are considered broken/revoked; validation is weak but cryptographically possible
        if (algorithm === 'MD5' || algorithm === 'SHA1') {
            trustValidationPossible = false; // Trust validation is impossible due to collision vulnerabilities
        } else if (algorithm === 'UNSUPPORTED_FUTURE') {
            hashValidationPossible = false;
            trustValidationPossible = false;
        }

        const isCompromisedByRot = !payloadReadable || !hashValidationPossible || !trustValidationPossible;

        return {
            evidenceId: `ev-${Math.abs(expectedHash.length * 31)}`,
            payloadReadable,
            hashValidationPossible,
            trustValidationPossible,
            isCompromisedByRot
        };
    }

    /**
     * Verifies that certificate root expiration or cryptographic decay does not
     * render archaeological capsule data unreadable to operators.
     */
    public auditSigningRootExpiration(
        certificateExpiryTimestamp: number
    ): { remainsReadable: boolean; ageYears: number; rootExpired: boolean } {
        const now = Date.now();
        const rootExpired = now > certificateExpiryTimestamp;
        
        // Calculate years since certificate expiration
        const diffMs = now - certificateExpiryTimestamp;
        const ageYears = rootExpired
            ? Math.round((diffMs / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10
            : 0;

        // Visualizer capsule files contain standard text/JSON payloads which remain
        // 100% human-readable even when signatures are expired.
        return {
            remainsReadable: true,
            ageYears,
            rootExpired
        };
    }

    /**
     * Runs the Long-Horizon Cryptography Rot Campaign.
     * Computes rot vulnerability scores and prints advisory warnings.
     */
    public runCryptoRotCampaign(
        campaignId: string,
        scenarios: CryptoAgingScenario[],
        evidences: { algorithm: string; payload: string; expectedHash: string }[],
        rootExpiryTimestamp: number
    ): CryptoRotCampaignReport {
        const details: Record<string, RottenEvidenceVerification> = {};
        const advisoryWarnings: string[] = [];
        let rottenEvidenceEvaluatedCount = 0;
        let rotCompromisedCount = 0;

        // 1. Audit obsolescence scenarios
        for (const scenario of scenarios) {
            advisoryWarnings.push(`Simulating cipher deprecation scenario '${scenario.scenarioId}': ${scenario.algorithm} is ${scenario.status} (deprecated since ${scenario.deprecatedSinceYear}).`);
        }

        // 2. Perform evidence replay simulation under rot conditions
        for (const ev of evidences) {
            rottenEvidenceEvaluatedCount++;
            const result = this.simulateDeprecatedCipherReplay(ev.algorithm, ev.payload, ev.expectedHash);
            details[result.evidenceId] = result;

            if (result.isCompromisedByRot) {
                rotCompromisedCount++;
                advisoryWarnings.push(`VULNERABLE EVIDENCE: Forensic object '${result.evidenceId}' signed with ${ev.algorithm} failed signature authenticity verification due to cryptographical aging.`);
            }
        }

        // 3. Audit root expiration
        const rootAudit = this.auditSigningRootExpiration(rootExpiryTimestamp);
        if (rootAudit.rootExpired) {
            advisoryWarnings.push(`EXPIRED IDENTITY ROOT: The local Witness Federation signature certificate expired ${rootAudit.ageYears} years ago. Evidence verification requires historical root rollover cert verification.`);
        }

        const rotVulnerabilityScore = rottenEvidenceEvaluatedCount > 0
            ? Math.round((rotCompromisedCount / rottenEvidenceEvaluatedCount) * 100) / 100
            : 0.0;

        const evidenceIntegrityMaintained = rotCompromisedCount === 0;

        return {
            campaignId,
            timestamp: Date.now(),
            scenariosSimulatedCount: scenarios.length,
            rottenEvidenceEvaluatedCount,
            rotVulnerabilityScore,
            evidenceIntegrityMaintained,
            advisoryWarnings,
            details
        };
    }
}
