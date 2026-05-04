// scripts/sre-global/fallback.js

/**
 * Regional Fallback Manager: Handles autonomous safety during control plane partitions.
 * If the Global Quorum is unreachable, the region must preserve stability by 
 * degrading to 'SAFE_MODE'.
 */
class FallbackManager {
  /**
   * Determines the 'Effective Mode' when quorum is lost.
   */
  degrade(currentStage, error) {
    console.log(`📡 [FALLBACK] Quorum Unreachable: ${error.message}. Entering SAFE_MODE.`);

    // 1. Force downgrade to Assisted or Shadow mode
    const fallbackStage = Math.min(currentStage, 1); // 0 (Shadow) or 1 (Assisted)
    
    return {
      stage: fallbackStage,
      isPartitioned: true,
      reason: 'QUORUM_TIMEOUT_OR_PARTITION',
      policyOverride: 'CONSERVATIVE'
    };
  }

  /**
   * Recovers from partition when quorum is restored.
   */
  recover(previousStage) {
    console.log(`📡 [FALLBACK] Quorum Restored. Resuming Stage ${previousStage}.`);
    return {
        stage: previousStage,
        isPartitioned: false
    };
  }
}

module.exports = new FallbackManager();
