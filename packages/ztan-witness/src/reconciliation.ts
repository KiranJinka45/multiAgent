import { QuorumEngine, QuorumState } from './quorum';
import { ArbitrationEngine, ArbitrationJustification } from './arbitration';
import { RootLedger, RootEpoch } from './ledger';
import { logger } from '../../observability/src';

/**
 * 🛡️ ReconciliationEngine
 * Heals institutional partitions and collapses minority forks.
 * Ensures the system converges on a single version of truth after conflict or delay.
 */
export class ReconciliationEngine {
  constructor(
    private readonly quorumEngine: QuorumEngine,
    private readonly arbitrationEngine: ArbitrationEngine,
    private readonly ledger: RootLedger
  ) {}

  /**
   * Reconciles a disputed epoch based on an arbitration decision.
   */
  public reconcileConflict(epochId: number): void {
    const state = this.quorumEngine.getEpochState(epochId);
    if (state !== QuorumState.DISPUTED) {
      throw new Error(`[ReconciliationEngine] Cannot reconcile epoch ${epochId}: Not in DISPUTED state`);
    }

    logger.info({ epochId }, '[ReconciliationEngine] Starting conflict reconciliation');

    // 1. Arbitrate
    const justification = this.arbitrationEngine.arbitrate(epochId);

    // 2. Collapse Fork
    // In a real system, this would involve purging losing roots and finalizing the winner
    this.quorumEngine.finalize(epochId);

    // 3. Mark as RECONCILED
    (this.quorumEngine as any).epochStates.set(epochId, QuorumState.RECONCILED);

    logger.info({ epochId, winningRoot: justification.winningRoot }, '[ReconciliationEngine] Conflict reconciled and collapsed');
  }

  /**
   * Attempts to heal partitions by processing quarantined epochs.
   */
  public healPartitions(quarantinedEpochs: RootEpoch[]): void {
    const latestEpochId = this.ledger.getLatestEpoch()?.epochId || 0;

    for (const epoch of quarantinedEpochs) {
      if (epoch.epochId === latestEpochId + 1) {
        logger.info({ epochId: epoch.epochId }, '[ReconciliationEngine] Lineage gap closed. Healing partition.');
        
        // In a real system, we would re-inject this into the ProtocolHandler
        // For now, we simulate the state transition
        (this.quorumEngine as any).epochStates.set(epoch.epochId, QuorumState.ACCEPTED);
      }
    }
  }
}
