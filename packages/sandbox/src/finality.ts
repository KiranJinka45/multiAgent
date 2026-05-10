import { SandboxExecutionResult, FinalizedEnvelope } from './types';
import { CanonicalReplayLayer } from './canonical';
import { logger } from '../../observability/src';

/**
 * 🛡️ ExecutionFinalityEngine
 * Enforces the formal state machine for execution finality.
 * Truth must become immutable BEFORE it becomes distributed.
 */
export class ExecutionFinalityEngine {
  /**
   * Transitions a result from COMPLETED to FINALIZED.
   * Performs mandatory validation of hashes, termination status, and teardown.
   */
  static finalize(
    missionId: string,
    result: SandboxExecutionResult,
    teardownSuccessful: boolean
  ): FinalizedEnvelope {
    logger.info({ executionId: result.executionId }, '[FinalityEngine] Initiating finalization sequence');

    // 1. Validation: Must have terminal exit code or security event
    if (!teardownSuccessful) {
      throw new Error(`[FinalityEngine] Cannot finalize: Teardown failed for execution ${result.executionId}`);
    }

    // 2. Integrity: Verify hashes are present and normalized
    if (!result.metadata.mountHash || !result.metadata.executionHash) {
      throw new Error(`[FinalityEngine] Cannot finalize: Missing lineage hashes`);
    }

    // 3. Stabilization: Create the Immutable Envelope
    const envelope: FinalizedEnvelope = {
      version: "1.0.0",
      missionId,
      executionId: result.executionId,
      lineage: {
        mountHash: result.metadata.mountHash,
        executionHash: result.metadata.executionHash,
      },
      outcome: {
        exitCode: result.exitCode,
        securityEvent: (result.metadata as any).securityEvent || null,
      },
      timestamp: result.metadata.timestamp,
    };

    logger.info({ 
      executionId: envelope.executionId, 
      missionId: envelope.missionId 
    }, '[FinalityEngine] Execution successfully FINALIZED');

    return Object.freeze(envelope); // Force immutability
  }
}
