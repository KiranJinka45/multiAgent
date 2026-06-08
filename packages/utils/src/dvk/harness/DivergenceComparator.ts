import type { 
  ReplayTelemetryProfile, 
  RuntimeArtifacts, 
  DivergenceClassification, 
  DivergenceWindow,
  ReplayArtifactCollector
} from './ReplayArtifactCollector.js';
import { SemanticProjector } from './SemanticProjector.js';
import { SemanticObjectProjector } from './SemanticObjectProjector.js';
import { RoundtripSemanticStabilizer } from './RoundtripSemanticStabilizer.js';

export class DivergenceComparator {

  /**
   * Compares the artifacts from two runtimes and calculates the divergence classification and windows.
   */
  public static compare(
    primary: RuntimeArtifacts,
    secondary: RuntimeArtifacts,
    payload?: string,
    ecosystemProfile?: 'rfc8259_strict' | 'canonical_order_strict' | 'ecma262' | 'legacy_first_win' | 'duplicate_error'
  ): {
    classification: DivergenceClassification;
    first_divergence_index: number | null;
    divergence_windows: DivergenceWindow[];
  } {
    const windows: DivergenceWindow[] = [];
    let firstDivergence: number | null = null;
    let currentWindow: DivergenceWindow | null = null;

    // Check for infrastructure failure
    if (primary.infrastructure_failure || secondary.infrastructure_failure) {
      const failure = primary.infrastructure_failure || secondary.infrastructure_failure;
      return {
        classification: failure as DivergenceClassification,
        first_divergence_index: null,
        divergence_windows: []
      };
    }

    const maxLen = Math.max(primary.snapshots.length, secondary.snapshots.length);

    for (let i = 0; i < maxLen; i++) {
      const pSnap = primary.snapshots[i];
      const sSnap = secondary.snapshots[i];

      const isDiverged = !pSnap || !sSnap || pSnap.hash !== sSnap.hash;

      if (isDiverged) {
        if (firstDivergence === null) {
          firstDivergence = i;
        }
        if (!currentWindow) {
          currentWindow = { start_snapshot: i, end_snapshot: null };
          windows.push(currentWindow);
        }
      } else {
        // Reconverged
        if (currentWindow) {
          currentWindow.end_snapshot = i;
          currentWindow = null;
        }
      }
    }

    // Determine classification
    let classification: DivergenceClassification = 'none';

    if (primary.final_result !== secondary.final_result) {
      classification = 'reject_trigger_divergence';
    } else if (firstDivergence !== null) {
      const lastWindow = windows[windows.length - 1];
      if (lastWindow && lastWindow.end_snapshot === null) {
        if (primary.snapshots.length !== secondary.snapshots.length) {
          classification = 'cadence_divergence';
        } else if (primary.trace_digest !== secondary.trace_digest) {
          classification = 'persistent_divergence';
        } else {
          classification = 'semantic_divergence';
        }
      } else {
        classification = 'recovering_divergence';
      }
    } else if (primary.trace_digest !== secondary.trace_digest) {
      classification = 'transition_divergence';
    } else {
      if (primary.topology_fingerprint && secondary.topology_fingerprint && primary.topology_fingerprint !== secondary.topology_fingerprint) {
        classification = 'TOPOLOGY_ASYMMETRY';
        if (primary.topology_windows && secondary.topology_windows) {
          const primKeys = Object.keys(primary.topology_windows).sort((a, b) => {
            const aStart = parseInt(a.split('_')[1], 10);
            const bStart = parseInt(b.split('_')[1], 10);
            return aStart - bStart;
          });
          for (const key of primKeys) {
            if (primary.topology_windows[key] !== secondary.topology_windows[key]) {
              const startIdx = parseInt(key.split('_')[1], 10);
              firstDivergence = startIdx;
              windows.push({ start_snapshot: startIdx, end_snapshot: null });
              break;
            }
          }
        }
      } else if (primary.metrics && secondary.metrics) {
        const primChunks = primary.metrics.snapshots_per_chunk.join(',');
        const secChunks = secondary.metrics.snapshots_per_chunk.join(',');
        if (primChunks !== secChunks) {
          classification = 'CADENCE_ASYMMETRY';
        } else {
          const primKeys = Object.keys(primary.metrics.transition_density).sort();
          const secKeys = Object.keys(secondary.metrics.transition_density).sort();
          let densityMatch = primKeys.length === secKeys.length;
          if (densityMatch) {
            for (const key of primKeys) {
              if (primary.metrics.transition_density[key] !== secondary.metrics.transition_density[key]) {
                densityMatch = false;
                break;
              }
            }
          }
          if (!densityMatch) {
            classification = 'TRANSITION_DENSITY_ASYMMETRY' as any;
          }
        }
      }
    }

    if (payload && classification !== 'none' && classification !== 'reject_trigger_divergence') {
      try {
        const proj = SemanticProjector.compare(primary.snapshots, secondary.snapshots, payload);
        
        let astEqual = false;
        let roundtripEqual = false;
        
        try {
          const tsTokens = SemanticObjectProjector.extractTSTokens(primary.snapshots);
          const rustTokens = SemanticObjectProjector.extractRustTokens(secondary.snapshots, payload);
          if (tsTokens.length > 0 && rustTokens.length > 0) {
            const tsAST = SemanticObjectProjector.buildAST(tsTokens, ecosystemProfile);
            const rustAST = SemanticObjectProjector.buildAST(rustTokens, ecosystemProfile);
            const astRes = SemanticObjectProjector.compareASTs(tsAST, rustAST, '', ecosystemProfile);
            astEqual = astRes.isEqual;

            // Perform Roundtrip Semantic Stabilization checks
            const tsReconstructed = tsTokens.map(t => t.value).join('');
            const rustReconstructed = rustTokens.map(t => t.value).join('');
            const tsStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(tsReconstructed);
            const rustStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(rustReconstructed);
            roundtripEqual = (tsStable === rustStable && tsStable !== '');
          } else {
            astEqual = proj.isEqual;
          }
        } catch (_e) {
          astEqual = false;
        }

        if ((proj.isEqual && astEqual) || roundtripEqual) {
          classification = 'semantic_aligned_cadence_divergence' as any;
        } else {
          classification = 'semantic_divergence';
        }
      } catch (_err) {
        classification = 'semantic_divergence';
      }
    }

    return {
      classification,
      first_divergence_index: firstDivergence,
      divergence_windows: windows
    };
  }

  /**
   * Invokes Replay Shrinking procedures if a divergence is detected.
   */
  public static attemptReplayShrinking(profile: ReplayTelemetryProfile): void {
    if (profile.classification === 'none' || profile.classification === 'recovering_divergence') {
      return;
    }
  }
}
