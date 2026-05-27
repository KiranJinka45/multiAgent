/**
 * ZTAN Phase Ω.2 - Hardware Attestation Campaign
 * 
 * DESIGN CONSTRAINTS:
 * 1. Passive verification and evidence collection only.
 * 2. Never allow attestation state to autonomously mutate runtime behavior.
 * 3. Bounded, advisory reports only. No autonomous recovery loops.
 */

export interface TpmPcrBank {
    pcrIndex: number;
    expectedHash: string;
    actualHash: string;
    verified: boolean;
}

export interface SevSnpAttestationReport {
    launchDigest: string;
    measurement: string;
    policy: number;
    signatureVerified: boolean;
    familyId?: string;
    imageKeyId?: string;
}

export interface TdxQuote {
    quoteVersion: number;
    mrTeerdDigest: string;
    mrTd: string; // Measurement of the TD guest
    signatureVerified: boolean;
    providerProvenance: string;
}

export interface SecureBootProvenance {
    secureBootEnabled: boolean;
    kekHash: string;
    dbHash: string;
    dbxRevocationChecked: boolean;
    signatureChainVerified: boolean;
}

export interface HardwareAttestationEvidence {
    hostId: string;
    timestamp: number;
    tpmPcrValues: TpmPcrBank[];
    sevSnpReport?: SevSnpAttestationReport;
    tdxQuote?: TdxQuote;
    secureBoot?: SecureBootProvenance;
}

export interface HardwareAttestationCampaignReport {
    campaignId: string;
    timestamp: number;
    checksPassed: boolean;
    trustScore: number; // 0.0 to 1.0
    violations: string[];
    advisoryRecommendations: string[];
    evidenceSnapshot: HardwareAttestationEvidence;
}

export class HardwareAttestationCampaign {
    /**
     * Executes passive audit over the collected hardware attestation evidence,
     * calculating a normalised trust score and compiling advisory findings.
     * Guaranteed to never mutate live execution state.
     */
    public runAttestationCampaign(
        campaignId: string,
        evidence: HardwareAttestationEvidence
    ): HardwareAttestationCampaignReport {
        const violations: string[] = [];
        const advisoryRecommendations: string[] = [];
        let checksPassed = true;
        let scoreAccumulator = 0;
        let maxPossibleScore = 0;

        // 1. Audit TPM PCR state (Weight: 25 points if present)
        if (evidence.tpmPcrValues && evidence.tpmPcrValues.length > 0) {
            maxPossibleScore += 25;
            let tpmPassed = true;
            let verifiedCount = 0;

            for (const pcr of evidence.tpmPcrValues) {
                if (!pcr.verified || pcr.actualHash !== pcr.expectedHash) {
                    tpmPassed = false;
                    violations.push(`TPM PCR ${pcr.pcrIndex} validation failed. Expected: '${pcr.expectedHash}', Got: '${pcr.actualHash}'`);
                } else {
                    verifiedCount++;
                }
            }

            if (tpmPassed) {
                scoreAccumulator += 25;
            } else {
                const ratio = verifiedCount / evidence.tpmPcrValues.length;
                scoreAccumulator += Math.round(25 * ratio);
                advisoryRecommendations.push('TPM PCR registers drifted. Re-measure boot chain and re-enroll clean Golden PCR values.');
            }
        } else {
            advisoryRecommendations.push('TPM PCR values not supplied. Measured boot status unverified.');
        }

        // 2. Audit Secure Boot (Weight: 25 points if present)
        if (evidence.secureBoot) {
            maxPossibleScore += 25;
            const sb = evidence.secureBoot;

            if (!sb.secureBootEnabled) {
                violations.push('Secure Boot is physically disabled in host firmware');
                checksPassed = false;
            } else {
                scoreAccumulator += 10;
            }

            if (sb.signatureChainVerified) {
                scoreAccumulator += 10;
            } else {
                violations.push('Firmware database (db/KEK) signature chain verification failed');
                checksPassed = false;
            }

            if (sb.dbxRevocationChecked) {
                scoreAccumulator += 5;
            } else {
                advisoryRecommendations.push('DBX revocation list checks not recently run on local UEFI db');
            }
        } else {
            advisoryRecommendations.push('Secure Boot provenance structures absent.');
        }

        // 3. Audit Confidential Computing hypervisor boundaries: AMD SEV-SNP (Weight: 50 points if present)
        if (evidence.sevSnpReport) {
            maxPossibleScore += 50;
            const snp = evidence.sevSnpReport;

            if (!snp.signatureVerified) {
                violations.push('AMD SEV-SNP hardware attestation signature validation failed');
                checksPassed = false;
            } else {
                scoreAccumulator += 30;
            }

            if (!snp.launchDigest || snp.launchDigest.length === 0) {
                violations.push('AMD SEV-SNP Launch Digest is empty or missing');
                checksPassed = false;
            } else {
                scoreAccumulator += 20;
            }
        }

        // 4. Audit Confidential Computing hypervisor boundaries: Intel TDX (Weight: 50 points if present)
        if (evidence.tdxQuote) {
            maxPossibleScore += 50;
            const tdx = evidence.tdxQuote;

            if (!tdx.signatureVerified) {
                violations.push('Intel TDX hardware quote signature validation failed');
                checksPassed = false;
            } else {
                scoreAccumulator += 30;
            }

            if (!tdx.mrTd || tdx.mrTd.length === 0) {
                violations.push('Intel TDX MRTD measurement validation failed');
                checksPassed = false;
            } else {
                scoreAccumulator += 20;
            }
        }

        // Standardize normalization
        const trustScore = maxPossibleScore > 0
            ? Math.round((scoreAccumulator / maxPossibleScore) * 100) / 100
            : 0.0;

        if (violations.length > 0) {
            checksPassed = false;
        }

        return {
            campaignId,
            timestamp: Date.now(),
            checksPassed,
            trustScore,
            violations,
            advisoryRecommendations,
            evidenceSnapshot: evidence
        };
    }
}
