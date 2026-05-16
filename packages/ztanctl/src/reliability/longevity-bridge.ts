import { LongevityEngine } from '@packages/memory-core';

/**
 * Bridge between ztanctl and the Institutional Longevity Engine.
 */
export function getLongevityEngine(): LongevityEngine {
    return new LongevityEngine();
}
