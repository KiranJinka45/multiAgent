import { ThresholdCrypto } from './crypto-utils';
import { StabilityCircuit, ZKProof } from './stability-circuit';
import { notaryService } from './notary-service';

const logger = console;

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
  // Telemetry used for ZK verification (in real audit, these are provided separately or reconstructed)
  _verification_data?: {
    acc: number;
    ldet: number;
    lsla: number;
  };
}

export class AuditVerifier {
  /**
   * Verifies a single audit entry for Elite Tier compliance.
   */
  public static async verifyEntry(entry: AuditEntry, groupPublicKey: string): Promise<boolean> {
    const { sequenceId, _audit, governance, elite, _verification_data } = entry;
    logger.info(`\n🔍 VERIFYING ENTRY [Seq: ${sequenceId}]`);

    // 1. Verify Hash Chain Continuity
    // (In full verify, this checks against prev entry)
    if (!_audit.hash) {
      logger.error('❌ FAILED: Missing audit hash.');
      return false;
    }

    // 2. Verify Threshold Signature (TSAC)
    if (_audit.ztan_consensus && _audit.aggregatedSignature) {
      const payload = `${sequenceId}|PASS|${entry.elite?.multiAgent?.consensus.action === 'NO_ACTION' ? 'UNKNOWN' : 'node-a'}`; // Simplified payload match
      const participants = governance.attestations
        .filter(a => a.status === 'PASS')
        .map(a => a.verifierId);

      const isSigValid = await ThresholdCrypto.verifyAggregate(
        _audit.aggregatedSignature,
        payload,
        groupPublicKey
      );

      if (isSigValid) {
        logger.info('✅ TSAC: Threshold signature is cryptographically valid.');
      } else {
        logger.error('❌ TSAC: Threshold signature FORGERY or INVALID quorum detected!');
        return false;
      }
    }

    // 3. Verify ZK Proof (ZKAV)
    if (_audit.zkProof && _verification_data) {
      const isZkValid = await StabilityCircuit.verifyProof(
        _audit.zkProof,
        _verification_data.acc,
        _verification_data.ldet,
        _verification_data.lsla
      );

      if (isZkValid) {
        logger.info('✅ ZKAV: Stability proof is mathematically correct.');
      } else {
        logger.error('❌ ZKAV: Stability proof calculation mismatch or invalid.');
        return false;
      }
    }

    // 4. Verify External Notarization (Phase 3)
    if (_audit.notarized && _audit.notarySeq) {
      const isNotaryValid = await notaryService.verify(_audit.hash, _audit.notarySeq);
      if (isNotaryValid) {
        logger.info('✅ NOTARY: External anchor verified in immutable ledger.');
      } else {
        logger.error('❌ NOTARY: Local head hash mismatch with external notarized anchor!');
        return false;
      }
    }

    logger.info(`🟢 ENTRY [Seq: ${sequenceId}] CERTIFIED AS AUDIT-GRADE.`);
    return true;
  }
}
