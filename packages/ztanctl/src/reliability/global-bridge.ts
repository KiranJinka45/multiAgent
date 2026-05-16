import { GlobalReliabilityEngine } from '@packages/global-reliability';

/**
 * Bridge between ztanctl and the Global Reliability Intelligence Network.
 */
export function getGlobalReliability(): GlobalReliabilityEngine {
    return new GlobalReliabilityEngine({
        redactIdentifiers: true,
        applyDifferentialPrivacy: true,
        noiseEpsilon: 0.05
    });
}
