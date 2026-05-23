import { RuntimePairExecutor } from './RuntimePairExecutor.js';
import type { ReplayExecutionContract } from './ReplayExecutionContract.js';

export class DeterminismVerifier {
  /**
   * Executes the identical ReplayExecutionContract multiple times (default 3)
   * to guarantee that the replay ID, chunk fragmentation, and trace digests
   * are absolutely deterministic.
   * 
   * Throws an error if nondeterminism is detected.
   */
  public static async verifyDeterminism(
    contract: ReplayExecutionContract,
    payload: string | Buffer,
    iterations: number = 3
  ): Promise<void> {
    if (iterations < 2) {
      throw new Error("Determinism Verification requires at least 2 iterations.");
    }

    const profiles = [];

    for (let i = 0; i < iterations; i++) {
      const profile = await RuntimePairExecutor.executeAndCompare(contract, payload);
      profiles.push(profile);
    }

    // Compare all subsequent profiles against the first one
    const baseline = profiles[0];

    for (let i = 1; i < iterations; i++) {
      const current = profiles[i];

      // 1. Verify Replay ID determinism
      if (baseline.replay_id !== current.replay_id) {
        throw new Error(`[Determinism Error] Replay ID skew detected! Baseline: ${baseline.replay_id}, Current: ${current.replay_id}`);
      }

      // 2. Verify Chunk Layout determinism
      const baseChunks = baseline.chunk_layout_sizes.join(',');
      const currChunks = current.chunk_layout_sizes.join(',');
      if (baseChunks !== currChunks) {
        throw new Error(`[Determinism Error] Chunk layout skew detected! Baseline: ${baseChunks}, Current: ${currChunks}`);
      }

      // 3. Verify Trace Digest reproducibility
      if (baseline.primary_artifacts.trace_digest !== current.primary_artifacts.trace_digest) {
        throw new Error(`[Determinism Error] Primary Runtime (${contract.runtime_pair.primary}) trace digest skew detected! Baseline: ${baseline.primary_artifacts.trace_digest}, Current: ${current.primary_artifacts.trace_digest}`);
      }

      if (baseline.secondary_artifacts.trace_digest !== current.secondary_artifacts.trace_digest) {
        throw new Error(`[Determinism Error] Secondary Runtime (${contract.runtime_pair.secondary}) trace digest skew detected! Baseline: ${baseline.secondary_artifacts.trace_digest}, Current: ${current.secondary_artifacts.trace_digest}`);
      }

      // 4. Verify Classification determinism
      if (baseline.classification !== current.classification) {
        throw new Error(`[Determinism Error] Classification skew detected! Baseline: ${baseline.classification}, Current: ${current.classification}`);
      }
    }
  }

  /**
   * Executes a long-run endurance campaign applying entropy injection to guarantee
   * false-determinism resistance across async latency and boundary scrambling.
   */
  public static async runEnduranceCampaign(
    contract: ReplayExecutionContract,
    payload: string | Buffer,
    iterations: number = 100
  ): Promise<void> {
    if (!contract.entropy_profile) {
      throw new Error("Endurance Campaign requires an active entropy_profile.");
    }
    
    // We execute the base contract (without deterministic seed variance first to establish a baseline)
    const baseline = await RuntimePairExecutor.executeAndCompare(contract, payload);

    for (let i = 0; i < iterations; i++) {
      // Create a deterministic but mutated seed for the current run to change entropy paths
      const iterationContract: ReplayExecutionContract = {
        ...contract,
        deterministic_seed: contract.deterministic_seed + `_iter_${i}`
      };

      const current = await RuntimePairExecutor.executeAndCompare(iterationContract, payload);

      // Verify Trace Digest reproducibility despite entropy injection
      if (baseline.primary_artifacts.trace_digest !== current.primary_artifacts.trace_digest) {
        throw new Error(`[Entropy Vulnerability] Primary Runtime trace digest changed under entropy injection at iteration ${i}! Baseline: ${baseline.primary_artifacts.trace_digest}, Current: ${current.primary_artifacts.trace_digest}`);
      }

      if (baseline.secondary_artifacts.trace_digest !== current.secondary_artifacts.trace_digest) {
        throw new Error(`[Entropy Vulnerability] Secondary Runtime trace digest changed under entropy injection at iteration ${i}! Baseline: ${baseline.secondary_artifacts.trace_digest}, Current: ${current.secondary_artifacts.trace_digest}`);
      }

      // Verify Topology Fingerprint reproducibility
      if (baseline.primary_artifacts.topology_fingerprint && baseline.primary_artifacts.topology_fingerprint !== current.primary_artifacts.topology_fingerprint) {
        throw new Error(`[Entropy Vulnerability] Primary Runtime topology fingerprint changed under entropy injection at iteration ${i}! Baseline: ${baseline.primary_artifacts.topology_fingerprint}, Current: ${current.primary_artifacts.topology_fingerprint}`);
      }
      if (baseline.secondary_artifacts.topology_fingerprint && baseline.secondary_artifacts.topology_fingerprint !== current.secondary_artifacts.topology_fingerprint) {
        throw new Error(`[Entropy Vulnerability] Secondary Runtime topology fingerprint changed under entropy injection at iteration ${i}! Baseline: ${baseline.secondary_artifacts.topology_fingerprint}, Current: ${current.secondary_artifacts.topology_fingerprint}`);
      }
    }
  }
}
