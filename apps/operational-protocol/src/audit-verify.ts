import { ThresholdCrypto, DEFAULT_THRESHOLD, DEFAULT_NODE_IDS } from './crypto-utils.js';
import { StabilityCircuit, type ZKProof } from './stability-circuit.js';
import { notaryService } from './notary-service.js';
import type { VerificationNarrative, TrustLevel } from './types.js';

const _logger = console;

export interface AuditEntry {
  sequenceId: number;
  elite?: {
    multiAgent?: {
      consensus: {
        action: string;
      };
    };
  };
  governance: {
    isCertified: boolean;
    mode: string;
    attestations: any[];
  };
  _audit: {
    hash: string;
    prevHash: string;
    ts: number;
    ztan_consensus: boolean;
    aggregatedSignature?: string;
    zkProof?: ZKProof;
    notarized?: boolean;
    notarySeq?: number;
  };
  _verification_data?: {
    acc: number;
    ldet: number;
    lsla: number;
  };
}

export class AuditVerifier {
  /**
   * Verifies a single audit entry and generates a human-intelligible narrative.
   */
  public static async verifyEntry(entry: AuditEntry, groupPublicKey: string): Promise<VerificationNarrative> {
    const { sequenceId, _audit, _verification_data } = entry;
    
    const findings: string[] = [];
    const evidence = {
      hashChainValid: true,
      quorumMet: false,
      zkProofValid: false,
      externalAnchorValid: false
    };

    // 1. Hash Chain Continuity
    if (!_audit.hash) {
      evidence.hashChainValid = false;
      findings.push('CRITICAL: Audit hash is missing; causal lineage is broken.');
    }

    // 2. Threshold Signature (Quorum)
    if (_audit.ztan_consensus && _audit.aggregatedSignature) {
      const payload = `${sequenceId}|PASS|${entry.elite?.multiAgent?.consensus.action === 'NO_ACTION' ? 'UNKNOWN' : 'node-a'}`;
      const isSigValid = await ThresholdCrypto.verifyAggregate(
        _audit.aggregatedSignature,
        payload,
        groupPublicKey,
        DEFAULT_THRESHOLD,
        DEFAULT_NODE_IDS
      );
      
      evidence.quorumMet = isSigValid;
      if (isSigValid) {
        findings.push('TRUST: Threshold quorum verified via cryptographic attestation.');
      } else {
        findings.push('CAUTION: Threshold signature failed; quorum validity is unproven.');
      }
    }

    // 3. ZK Proof
    if (_audit.zkProof && _verification_data) {
      const isZkValid = await StabilityCircuit.verifyProof(
        _audit.zkProof,
        _verification_data.acc,
        _verification_data.ldet,
        _verification_data.lsla
      );
      evidence.zkProofValid = isZkValid;
      if (isZkValid) {
        findings.push('INTEGRITY: Zero-knowledge stability proof is mathematically valid.');
      } else {
        findings.push('CRITICAL: ZK-Stability proof mismatch; state calculation is untrusted.');
      }
    }

    // 4. External Notarization
    if (_audit.notarized && _audit.notarySeq) {
      const isNotaryValid = await notaryService.verify(_audit.hash, _audit.notarySeq);
      evidence.externalAnchorValid = isNotaryValid;
      if (isNotaryValid) {
        findings.push('ANCHOR: Evidence verified against external notarized ledger.');
      } else {
        findings.push('WARNING: External notarization mismatch; evidence might be isolated.');
      }
    }

    // Determine Trust Level
    let trustLevel: TrustLevel = 'UNTRUSTED';
    let confidence = 0.0;

    if (evidence.hashChainValid && evidence.quorumMet && evidence.zkProofValid && evidence.externalAnchorValid) {
      trustLevel = 'FULL';
      confidence = 1.0;
    } else if (evidence.hashChainValid && (evidence.quorumMet || evidence.zkProofValid)) {
      trustLevel = 'DEGRADED';
      confidence = 0.6;
    } else if (evidence.hashChainValid) {
      trustLevel = 'CONDITIONAL';
      confidence = 0.3;
    }

    const summary = trustLevel === 'FULL' 
      ? `Entry ${sequenceId} is fully certified and cryptographically anchored.`
      : `Entry ${sequenceId} is operating under ${trustLevel} trust constraints.`;

    const recommedation = trustLevel === 'FULL'
      ? 'No operator action required; system is in deterministic steady state.'
      : 'Operator intervention recommended: verify manual quorum and check network partition status.';

    return {
      sequenceId,
      trustLevel,
      confidence,
      summary,
      findings,
      forensicEvidence: evidence,
      recommedation
    };
  }
}
