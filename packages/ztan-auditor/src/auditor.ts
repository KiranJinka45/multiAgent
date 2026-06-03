import { FinalizedEnvelope } from '../../evidence-lifecycle/src/evidence-packet';
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
        } catch (e) {
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

        const signaturesToCheck: string[] = [];
        if (packet.containmentProof?.signature) {
            signaturesToCheck.push(packet.containmentProof.signature);
        } else {
            report.isValid = false;
            report.reasons.push('Missing containment proof signature.');
        }

        if (packet.recoveryAssurance?.engineSignature) {
            signaturesToCheck.push(packet.recoveryAssurance.engineSignature);
        } else {
            report.isValid = false;
            report.reasons.push('Missing recovery assurance signature.');
        }

        if (packet.sandboxAttestation?.providerSignature) {
            signaturesToCheck.push(packet.sandboxAttestation.providerSignature);
        } else {
            report.isValid = false;
            report.reasons.push('Missing sandbox attestation signature.');
        }

        if (this.registry.hasRevokedSignatures(signaturesToCheck)) {
            report.isValid = false;
            report.reasons.push('Packet contains revoked signatures.');
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
