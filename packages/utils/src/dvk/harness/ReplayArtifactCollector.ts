import type { ReplayExecutionContract, RuntimeIdentifier } from './ReplayExecutionContract.js';
import type { ReplayFailureClass } from './ReplayFailureTaxonomy.js';
import type { SnapshotMetrics, ReplayAbandonmentLineage } from './ArtifactSchemaValidator.js';

export interface SnapshotTelemetry {
  sequence_index: number;
  hash: string;
  transition_reason: string;
  metadata?: any;
}

export interface RuntimeArtifacts {
  runtime: RuntimeIdentifier;
  final_result: 'accept' | 'reject' | 'error';
  error_message?: string;
  infrastructure_failure?: ReplayFailureClass;
  trace_digest: string;
  snapshots: SnapshotTelemetry[];
  metrics?: SnapshotMetrics;
  topology_fingerprint?: string;
  topology_windows?: Record<string, string>;
  provenance_lineage?: any;
  cross_runtime_mode?: 'mirrored' | 'differential';
  infrastructure_failure_metadata?: ReplayAbandonmentLineage;
}

export type DivergenceClassification = 
  | 'semantic_divergence'
  | 'cadence_divergence'
  | 'semantic_aligned_cadence_divergence'
  | 'transition_divergence'
  | 'recovering_divergence'
  | 'persistent_divergence'
  | 'reject_trigger_divergence'
  | 'CADENCE_ASYMMETRY'
  | 'TOPOLOGY_ASYMMETRY'
  | 'none'
  | ReplayFailureClass;

export interface DivergenceWindow {
  start_snapshot: number;
  end_snapshot: number | null; // null if it never reconverges (persistent)
}

export interface ReplayTelemetryProfile {
  replay_id: string;
  contract: ReplayExecutionContract;
  chunk_layout_sizes: number[];
  primary_artifacts: RuntimeArtifacts;
  secondary_artifacts: RuntimeArtifacts;
  classification: DivergenceClassification;
  first_divergence_index: number | null;
  divergence_windows: DivergenceWindow[];
}

export class ReplayArtifactCollector {
  private primary: RuntimeArtifacts;
  private secondary: RuntimeArtifacts;
  private chunkSizes: number[] = [];

  constructor(
    private contract: ReplayExecutionContract,
    private replayId: string,
    primaryRuntime: RuntimeIdentifier,
    secondaryRuntime: RuntimeIdentifier
  ) {
    this.primary = this.createEmptyArtifact(primaryRuntime);
    this.secondary = this.createEmptyArtifact(secondaryRuntime);
  }

  private createEmptyArtifact(runtime: RuntimeIdentifier): RuntimeArtifacts {
    return {
      runtime,
      final_result: 'error',
      trace_digest: '',
      snapshots: []
    };
  }

  public recordChunk(size: number) {
    this.chunkSizes.push(size);
  }

  public recordSnapshot(runtime: RuntimeIdentifier, snapshot: SnapshotTelemetry) {
    if (runtime === this.primary.runtime) {
      this.primary.snapshots.push(snapshot);
    } else {
      this.secondary.snapshots.push(snapshot);
    }
  }

  public finalizeRuntime(
    runtime: RuntimeIdentifier,
    finalResult: 'accept' | 'reject' | 'error',
    traceDigest: string,
    errorMessage?: string,
    infrastructureFailure?: ReplayFailureClass,
    metrics?: SnapshotMetrics,
    topologyFingerprint?: string,
    provenanceLineage?: any,
    crossRuntimeMode?: 'mirrored' | 'differential',
    topologyWindows?: Record<string, string>,
    infrastructureFailureMetadata?: ReplayAbandonmentLineage
  ) {
    const art = runtime === this.primary.runtime ? this.primary : this.secondary;
    art.final_result = finalResult;
    art.trace_digest = traceDigest;
    art.error_message = errorMessage;
    if (infrastructureFailure) {
      art.infrastructure_failure = infrastructureFailure;
    }
    if (metrics) {
      art.metrics = metrics;
    }
    if (topologyFingerprint) {
      art.topology_fingerprint = topologyFingerprint;
    }
    if (provenanceLineage) {
      art.provenance_lineage = provenanceLineage;
    }
    if (crossRuntimeMode) {
      art.cross_runtime_mode = crossRuntimeMode;
    }
    if (topologyWindows) {
      art.topology_windows = topologyWindows;
    }
    if (infrastructureFailureMetadata) {
      art.infrastructure_failure_metadata = infrastructureFailureMetadata;
    }
  }

  public generateProfile(
    classification: DivergenceClassification,
    first_divergence_index: number | null,
    divergence_windows: DivergenceWindow[]
  ): ReplayTelemetryProfile {
    return {
      replay_id: this.replayId,
      contract: this.contract,
      chunk_layout_sizes: this.chunkSizes,
      primary_artifacts: this.primary,
      secondary_artifacts: this.secondary,
      classification,
      first_divergence_index,
      divergence_windows
    };
  }
}
