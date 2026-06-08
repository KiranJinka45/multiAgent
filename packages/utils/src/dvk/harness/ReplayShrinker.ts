import { RuntimePairExecutor } from './RuntimePairExecutor.js';
import type { ReplayExecutionContract } from './ReplayExecutionContract.js';
import type { DivergenceClassification } from './ReplayArtifactCollector.js';
import { IncrementalStreamingTokenizer } from '../../run-incremental-stream-fuzz.js';

export interface ShrinkResult {
  original_payload: string | Buffer;
  shrunk_payload: string | Buffer;
  classification: DivergenceClassification;
  iterations: number;
}

export class ReplayShrinker {
  /**
   * Attempts to deterministically shrink a payload that causes a specific divergence classification.
   * Uses binary reduction to find the minimal counterexample that still preserves the divergence footprint.
   */
  public static async shrink(
    contract: ReplayExecutionContract,
    payload: string,
    targetClassification: DivergenceClassification
  ): Promise<ShrinkResult> {
    let currentPayload = payload;
    let iterations = 0;

    const tryShrink = async (testPayload: string): Promise<boolean> => {
      iterations++;
      const profile = await RuntimePairExecutor.executeAndCompare(contract, testPayload);
      return profile.classification === targetClassification;
    };

    // First attempt Semantic Token-Based Shrinking
    try {
      const tokenizer = new IncrementalStreamingTokenizer();
      const tokens = tokenizer.write(payload);
      tokens.push(...tokenizer.end());

      let tokenStep = Math.floor(tokens.length / 2);
      while (tokenStep > 0 && tokens.length > 1) {
        const leftHalf = tokens.slice(0, tokens.length - tokenStep);
        const rightHalf = tokens.slice(tokenStep);

        const leftStr = leftHalf.map(t => payload.substring(t.start, t.end)).join('');
        const rightStr = rightHalf.map(t => payload.substring(t.start, t.end)).join('');

        if (await tryShrink(leftStr)) {
          tokens.splice(tokens.length - tokenStep, tokenStep);
          currentPayload = leftStr;
          tokenStep = Math.floor(tokens.length / 2);
        } else if (await tryShrink(rightStr)) {
          tokens.splice(0, tokenStep);
          currentPayload = rightStr;
          tokenStep = Math.floor(tokens.length / 2);
        } else {
          tokenStep = Math.floor(tokenStep / 2);
        }
      }
    } catch (_e) {
      // Tokenizer failed, fallback to safe byte reduction
    }

    // Binary reduction fallback for unstructured raw string content if tokenizer yielded 1 huge token
    let step = Math.floor(currentPayload.length / 2);
    while (step > 0 && currentPayload.length > 1) {
      const leftHalf = currentPayload.substring(0, currentPayload.length - step);
      const rightHalf = currentPayload.substring(step);

      if (await tryShrink(leftHalf)) {
        currentPayload = leftHalf;
        step = Math.floor(currentPayload.length / 2);
      } else if (await tryShrink(rightHalf)) {
        currentPayload = rightHalf;
        step = Math.floor(currentPayload.length / 2);
      } else {
        // If neither half works, reduce step size
        step = Math.floor(step / 2);
      }
    }

    // Try character-by-character from the end
    while (currentPayload.length > 1) {
      const trimmed = currentPayload.substring(0, currentPayload.length - 1);
      if (await tryShrink(trimmed)) {
        currentPayload = trimmed;
      } else {
        break;
      }
    }

    // Try character-by-character from the beginning
    while (currentPayload.length > 1) {
      const trimmed = currentPayload.substring(1);
      if (await tryShrink(trimmed)) {
        currentPayload = trimmed;
      } else {
        break;
      }
    }

    return {
      original_payload: payload,
      shrunk_payload: currentPayload,
      classification: targetClassification,
      iterations
    };
  }
}
