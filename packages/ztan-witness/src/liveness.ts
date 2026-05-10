import { QuorumEngine, QuorumState } from './quorum';
import { logger } from '../../observability/src';

export interface LivenessPolicy {
  readonly quorumTimeoutMs: number;
  readonly arbitrationDeadlineMs: number;
  readonly maxConsecutiveExpirations: number;
}

/**
 * 🛡️ LivenessMonitor
 * Governs forward progress and ensures the system doesn't stall indefinitely.
 * While safety is paramount, liveness is what makes the system operational.
 */
export class LivenessMonitor {
  private epochTimestamps: Map<number, number> = new Map();
  private consecutiveExpirations: number = 0;

  constructor(
    private readonly quorumEngine: QuorumEngine,
    private readonly policy: LivenessPolicy
  ) {}

  /**
   * Tracks the start of an epoch process for liveness monitoring.
   */
  public monitorEpoch(epochId: number): void {
    if (!this.epochTimestamps.has(epochId)) {
      this.epochTimestamps.set(epochId, Date.now());
      logger.info({ epochId }, '[LivenessMonitor] Epoch progress monitoring started');
    }
  }

  /**
   * Checks all active epochs for timeout violations.
   */
  public checkLiveness(): void {
    const now = Date.now();
    
    for (const [epochId, startTime] of this.epochTimestamps.entries()) {
      const state = this.quorumEngine.getEpochState(epochId);
      
      // Skip completed or already failed states
      if (state === QuorumState.FINALIZED || state === QuorumState.EXPIRED || state === QuorumState.HALTED) {
        continue;
      }

      const elapsed = now - startTime;
      
      // 1. Quorum Timeout Check
      if (state === QuorumState.PROPOSED || state === QuorumState.ATTESTED) {
        if (elapsed > this.policy.quorumTimeoutMs) {
          this.expireEpoch(epochId, "Quorum formation timeout");
        }
      }

      // 2. Arbitration Deadline Check
      if (state === QuorumState.DISPUTED) {
        if (elapsed > this.policy.arbitrationDeadlineMs) {
          this.expireEpoch(epochId, "Arbitration resolution deadline exceeded");
        }
      }
    }
  }

  private expireEpoch(epochId: number, reason: string): void {
    logger.warn({ epochId, reason }, '[LivenessMonitor] Epoch EXPIRED due to liveness violation');
    
    // Update QuorumEngine state (simulated transition)
    (this.quorumEngine as any).epochStates.set(epochId, QuorumState.EXPIRED);
    
    this.consecutiveExpirations++;
    
    // 3. Institutional Halt Check
    if (this.consecutiveExpirations >= this.policy.maxConsecutiveExpirations) {
      this.haltInstitutionalProgress();
    }
  }

  private haltInstitutionalProgress(): void {
    logger.error({ 
      consecutiveExpirations: this.consecutiveExpirations,
      threshold: this.policy.maxConsecutiveExpirations 
    }, '[LivenessMonitor] INSTITUTIONAL HALT: Stagnation threshold reached. Manual intervention required.');
    
    // Set all active epochs to HALTED
    for (const epochId of this.epochTimestamps.keys()) {
        (this.quorumEngine as any).epochStates.set(epochId, QuorumState.HALTED);
    }
  }

  public resetConsecutiveExpirations(): void {
    this.consecutiveExpirations = 0;
  }
}
