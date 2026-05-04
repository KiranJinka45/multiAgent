// scripts/sre-global/gray-failure-engine.js
/**
 * Real-World Gray Failure Engine.
 * Simulates subtle, non-binary failures that break distributed consistency.
 */
class GrayFailureEngine {
  async inject() {
    const r = Math.random();

    if (r < 0.2) {
      console.log('🌫️ [GRAY-CHAOS] Partial write (ACK lost, but applied)');
      return { type: 'lost_ack', action: 'APPLY_SILENTLY' };
    }

    if (r < 0.4) {
      console.log('🌫️ [GRAY-CHAOS] Stale read injected (Returning cached data)');
      return { type: 'stale_read', action: 'CACHE_FALLBACK' };
    }

    if (r < 0.6) {
      console.log('🌫️ [GRAY-CHAOS] Delayed write (fsync lag / disk pressure)');
      await new Promise(r => setTimeout(r, 2000));
      return { type: 'delayed_write', action: 'LATENCY_SPIKE' };
    }

    if (r < 0.8) {
      console.log('🌫️ [GRAY-CHAOS] Network jitter spike (1.5s delay)');
      await new Promise(r => setTimeout(r, Math.random() * 1500));
      return { type: 'jitter', action: 'TIMEOUT_RISK' };
    }

    console.log('🌫️ [GRAY-CHAOS] Normal operation');
    return { type: 'none' };
  }
}

module.exports = new GrayFailureEngine();
