import { FinalizedEnvelope } from '../../evidence-lifecycle/src/evidence-packet';
import { CryptoUtils } from '../../evidence-lifecycle/src/crypto-utils';
import { TrustRegistry } from '../../federation/src/trust-registry';

export interface AuditReport {
    isValid: boolean;
    reasons: string[];
}

export class OfflineAuditor {
    private registry: TrustRegistry;

    constructor(trustRegistrySnapshot: string) {
        this.registry = TrustRegistry.deserialize(trustRegistrySnapshot);
    }

    public auditPacket(packetJson: string): AuditReport {
        const report: AuditReport = {
            isValid: true,
            reasons: []
        };

        let packet: FinalizedEnvelope;
        try {
            packet = JSON.parse(packetJson);
        } catch {
            report.isValid = false;
            report.reasons.push('Invalid JSON packet format.');
            return report;
        }

        if (!packet.governanceEpoch) {
            report.isValid = false;
            report.reasons.push('Missing governance epoch anchor.');
        } else if (!packet.merkleLineage) {
            report.isValid = false;
            report.reasons.push('Missing merkle lineage.');
        } else if (!this.registry.isValidRootForEpoch(packet.governanceEpoch, packet.merkleLineage.rootHash)) {
            report.isValid = false;
            report.reasons.push(`Untrusted governance root for epoch ${packet.governanceEpoch}.`);
        }

        const { signature: sig1, ...containmentData } = packet.containmentProof || { signature: '' };
        const { engineSignature: sig2, ...rollbackData } = packet.recoveryAssurance || { engineSignature: '' };
        const { providerSignature: sig3, ...sandboxData } = packet.sandboxAttestation || { providerSignature: '' };

        if (!sig1) report.reasons.push('Missing containment proof signature.');
        if (!sig2) report.reasons.push('Missing recovery assurance signature.');
        if (!sig3) report.reasons.push('Missing sandbox attestation signature.');

        if (sig1 && sig2 && sig3 && report.isValid) {
            const trustedKeys = this.registry.getOperatorKeysForEpoch(packet.governanceEpoch);
            let validKeyFound = false;
            let revokedKeyEncountered = false;

            for (const pubKey of trustedKeys) {
                if (this.registry.isRevoked(pubKey)) {
                    // Try to verify if this was the key used
                    const isContainmentValid = CryptoUtils.verifySignature(containmentData, sig1, pubKey);
                    if (isContainmentValid) {
                        revokedKeyEncountered = true;
                        break;
                    }
                    continue;
                }

                const isContainmentValid = CryptoUtils.verifySignature(containmentData, sig1, pubKey);
                const isRollbackValid = CryptoUtils.verifySignature(rollbackData, sig2, pubKey);
                const isSandboxValid = CryptoUtils.verifySignature(sandboxData, sig3, pubKey);

                if (isContainmentValid && isRollbackValid && isSandboxValid) {
                    validKeyFound = true;
                    break;
                }
            }

            if (revokedKeyEncountered) {
                report.isValid = false;
                report.reasons.push('Packet contains signatures from a revoked operator key.');
            } else if (!validKeyFound) {
                report.isValid = false;
                report.reasons.push('Cryptographic signature verification failed or no trusted key matched.');
            }
        } else {
            report.isValid = false;
        }

        if (packet.containmentProof?.pathTraversalDetected) {
            report.isValid = false;
            report.reasons.push('Containment breach detected (path traversal).');
        }

        if (packet.economicRationality && !packet.economicRationality.withinBudget) {
            report.isValid = false;
            report.reasons.push('Economic rationality budget exceeded.');
        }

        return report;
    }
}
