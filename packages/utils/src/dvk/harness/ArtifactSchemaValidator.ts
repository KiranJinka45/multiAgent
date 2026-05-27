import type { SnapshotTelemetry } from './ReplayArtifactCollector.js';

export interface ProvenanceLineage {
  entropy_profile?: any;
  transport_corruption_mode?: string;
  chunk_strategy?: string;
  jitter_profile?: any;
  stdout_strategy?: string;
  seed?: string;
}

export interface SnapshotMetrics {
  total_snapshots: number;
  snapshots_per_chunk: number[];
  snapshots_per_byte: number;
  transition_density: Record<string, number>;
  snapshots_per_sec?: number;
  transitions_per_byte?: number;
  throughput_bytes_per_sec?: number;
  replay_wall_clock_ms?: number;
  chunk_stall_ms?: number;
  stdout_frame_count?: number;
  replay_memory_peak?: number;
  telemetry_overhead_ms?: number;
  topology_hash_cpu_cost?: number;
  snapshot_memory_cost?: number;
  telemetry_frames_written?: number;
  telemetry_cost_per_snapshot?: number;
  topology_cost_per_window?: number;
  memory_growth_per_transition?: number;
  serialization_cost_per_frame?: number;
  stdout_drain_latency?: number;
}

export interface ReplayAbandonmentLineage {
  partial_stdout?: string;
  partial_snapshots_recovered?: number;
  last_sequence_index?: number;
  partial_topology_windows?: Record<string, string>;
  topology_loss_severity?: number;
}

export interface ValidatedRuntimeResponse {
  status: 'accept' | 'reject' | 'error';
  trace_digest: string;
  snapshots: SnapshotTelemetry[];
  error_message?: string;
  metrics?: SnapshotMetrics;
  topology_fingerprint?: string;
  topology_windows?: Record<string, string>;
  provenance_lineage?: ProvenanceLineage;
  cross_runtime_mode?: 'mirrored' | 'differential';
  infrastructure_failure_metadata?: ReplayAbandonmentLineage;
}

export class ArtifactSchemaValidator {
  
  /**
   * Strictly validates the parsed JSON artifact from a runtime subprocess.
   * Throws an error if the schema is malformed.
   */
  public static validate(data: any): ValidatedRuntimeResponse {
    if (!data || typeof data !== 'object') {
      throw new Error("Artifact is not a valid JSON object");
    }

    if (!['accept', 'reject', 'error'].includes(data.status)) {
      throw new Error(`Invalid status field: ${data.status}`);
    }

    if (typeof data.trace_digest !== 'string') {
      throw new Error("Missing or invalid trace_digest string");
    }

    if (!Array.isArray(data.snapshots)) {
      throw new Error("Missing or invalid snapshots array");
    }

    for (let i = 0; i < data.snapshots.length; i++) {
      const snap = data.snapshots[i];
      if (typeof snap.sequence_index !== 'number') {
        throw new Error(`Snapshot ${i} missing sequence_index`);
      }
      if (typeof snap.hash !== 'string' || snap.hash.length === 0) {
        throw new Error(`Snapshot ${i} missing hash`);
      }
      if (typeof snap.transition_reason !== 'string') {
        throw new Error(`Snapshot ${i} missing transition_reason`);
      }
      // Temporal Ordering Verification: Monotonicity Enforcement
      if (i > 0 && snap.sequence_index <= data.snapshots[i - 1].sequence_index) {
        throw new Error(`Temporal ordering violation: Snapshot ${i} (index ${snap.sequence_index}) is not strictly greater than Snapshot ${i - 1} (index ${data.snapshots[i - 1].sequence_index})`);
      }
    }

    if (data.metrics) {
      if (typeof data.metrics.total_snapshots !== 'number') {
        throw new Error("metrics.total_snapshots missing or invalid");
      }
      if (!Array.isArray(data.metrics.snapshots_per_chunk)) {
        throw new Error("metrics.snapshots_per_chunk missing or invalid");
      }
      if (typeof data.metrics.snapshots_per_byte !== 'number') {
        throw new Error("metrics.snapshots_per_byte missing or invalid");
      }
      if (typeof data.metrics.transition_density !== 'object' || data.metrics.transition_density === null) {
        throw new Error("metrics.transition_density missing or invalid");
      }
      if (data.metrics.telemetry_cost_per_snapshot !== undefined && typeof data.metrics.telemetry_cost_per_snapshot !== 'number') {
        throw new Error("metrics.telemetry_cost_per_snapshot invalid");
      }
      if (data.metrics.topology_cost_per_window !== undefined && typeof data.metrics.topology_cost_per_window !== 'number') {
        throw new Error("metrics.topology_cost_per_window invalid");
      }
      if (data.metrics.memory_growth_per_transition !== undefined && typeof data.metrics.memory_growth_per_transition !== 'number') {
        throw new Error("metrics.memory_growth_per_transition invalid");
      }
      if (data.metrics.serialization_cost_per_frame !== undefined && typeof data.metrics.serialization_cost_per_frame !== 'number') {
        throw new Error("metrics.serialization_cost_per_frame invalid");
      }
      if (data.metrics.stdout_drain_latency !== undefined && typeof data.metrics.stdout_drain_latency !== 'number') {
        throw new Error("metrics.stdout_drain_latency invalid");
      }
    }

    if (data.topology_fingerprint !== undefined && typeof data.topology_fingerprint !== 'string') {
      throw new Error("Invalid topology_fingerprint format");
    }

    if (data.topology_windows !== undefined && (typeof data.topology_windows !== 'object' || data.topology_windows === null)) {
      throw new Error("Invalid topology_windows format");
    }

    if (data.provenance_lineage !== undefined && typeof data.provenance_lineage !== 'object') {
      throw new Error("Invalid provenance_lineage format");
    }

    if (data.cross_runtime_mode !== undefined && !['mirrored', 'differential'].includes(data.cross_runtime_mode)) {
      throw new Error(`Invalid cross_runtime_mode: ${data.cross_runtime_mode}`);
    }

    if (data.infrastructure_failure_metadata !== undefined && typeof data.infrastructure_failure_metadata !== 'object') {
      throw new Error("Invalid infrastructure_failure_metadata format");
    }

    // Pass-through cast now that we have proven its structure
    return data as ValidatedRuntimeResponse;
  }
}
