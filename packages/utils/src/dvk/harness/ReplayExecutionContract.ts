import * as crypto from 'node:crypto';

export type RuntimeIdentifier = 'rust' | 'typescript' | 'python';

export type ChunkStrategy = 
  | 'fixed'
  | 'alternating'
  | 'boundary_targeted'
  | 'escape_targeted'
  | 'deterministic_random';

export interface RuntimePair {
  primary: RuntimeIdentifier;
  secondary: RuntimeIdentifier;
}

export interface FragmentationProfile {
  strategy: ChunkStrategy;
  params?: Record<string, any>; // e.g., seed for random, sizes for fixed
}

export interface EntropyProfile {
  /** Enables randomized chunk arrival latency within the subprocess bridge. */
  async_chunk_jitter?: boolean;
  /** Enables random splitting of payload boundaries (including inside multi-byte sequences if strategy allows). */
  randomized_boundaries?: boolean;
  /** Simulates partial stdout flushes. */
  stdout_fragmentation?: boolean;

  /** Transport Perturbations */
  partial_stdout_truncation?: boolean;
  delayed_final_newline?: boolean;
  duplicated_chunk_delivery?: boolean;

  /** Scheduler Adversarialism & Starvation */
  scheduler_contention?: boolean;

  /** Sabotage Scaling Intensity (0.0 to 2.0) */
  intensity_factor?: number;

  /** Dedicated Asymmetric Sabotage Intensities */
  jitter_intensity?: number;
  backpressure_intensity?: number;
  stderr_flood_intensity?: number;
  starvation_intensity?: number;
  descriptor_exhaustion?: boolean;
}

export type EcosystemProfile = 'rfc8259_strict' | 'canonical_order_strict' | 'ecma262' | 'legacy_first_win' | 'duplicate_error';

export interface ReplayExecutionContract {
  corpus_id: string;
  deterministic_seed: string;
  runtime_pair: RuntimePair;
  chunk_strategy: ChunkStrategy;
  fragmentation_profile: FragmentationProfile;
  expected_behavior?: 'accept' | 'reject';
  snapshot_schema_version: string;
  entropy_profile?: EntropyProfile;
  topology_flush_interval?: number;
  ecosystem_profile?: EcosystemProfile;
}

/**
 * Generates the canonical deterministic identity for a replay execution.
 */
export function generateReplayId(contract: ReplayExecutionContract): string {
  // Deterministic layout representation for hashing
  const chunkLayoutStr = JSON.stringify({
    strategy: contract.chunk_strategy,
    profile: contract.fragmentation_profile,
  });
  
  const runtimePairStr = `${contract.runtime_pair.primary}_${contract.runtime_pair.secondary}`;

  const hashData = [
    contract.corpus_id,
    chunkLayoutStr,
    contract.deterministic_seed,
    runtimePairStr,
    contract.snapshot_schema_version
  ].join('|');

  return crypto.createHash('sha256').update(hashData).digest('hex');
}
