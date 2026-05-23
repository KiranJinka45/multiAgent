import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { IncrementalStreamingTokenizer, IncrementalStreamingValidator } from '../../run-incremental-stream-fuzz.js';

interface SnapshotTelemetry {
  sequence_index: number;
  hash: string;
  transition_reason: string;
  metadata?: any;
}

interface SnapshotMetrics {
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

interface RuntimeResponse {
  status: 'accept' | 'reject' | 'error';
  trace_digest: string;
  snapshots: SnapshotTelemetry[];
  error_message?: string;
  metrics?: SnapshotMetrics;
  topology_fingerprint?: string;
  topology_windows?: Record<string, string>;
  provenance_lineage?: any;
  cross_runtime_mode?: 'mirrored' | 'differential';
  infrastructure_failure_metadata?: any;
}

function computeStateHash(stateData: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(stateData)).digest('hex');
}

async function main() {
  const startTime = performance.now();
  let accumulatedJitter = 0;
  let stdin = '';
  try {
    stdin = fs.readFileSync(0, 'utf-8');
  } catch (e) {
    // If stdin read fails, we can't do anything meaningful
    process.exit(1);
  }

  if (!stdin.trim()) {
    process.exit(0);
  }

  let envelope: any;
  try {
    envelope = JSON.parse(stdin);
  } catch (e) {
    process.exit(1);
  }

  const executionContract = envelope.contract || {};
  const chunksBase64: string[] = envelope.chunks || [];
  const flushInterval = Math.max(1, executionContract.topology_flush_interval ?? 64);
  
  const tokenizer = new IncrementalStreamingTokenizer();
  const validator = new IncrementalStreamingValidator();

  const isPhase15 = String(executionContract.corpus_id || '').includes('conformance_p15');
  tokenizer.isPhase15 = isPhase15;
  validator.isPhase15 = isPhase15;
  
  const snapshots: SnapshotTelemetry[] = [];
  let sequence_index = 0;
  let total_payload_bytes = 0;
  const snapshots_per_chunk: number[] = [];
  const transition_density: Record<string, number> = {};
  const transition_sequence: string[] = [];
  const topology_windows: Record<string, string> = {};
  let telemetryOverheadTotalMs = 0;

  function recordSnapshot(reason: string, state: any, metadata?: any) {
    const tStart = performance.now();
    const sHash = computeStateHash(state);
    const snap: SnapshotTelemetry = {
      sequence_index: sequence_index++,
      hash: sHash,
      transition_reason: reason
    };
    if (metadata) {
      snap.metadata = metadata;
    }
    snapshots.push(snap);
    transition_density[reason] = (transition_density[reason] || 0) + 1;
    transition_sequence.push(`${reason}:${sHash}`);
    telemetryOverheadTotalMs += performance.now() - tStart;

    // Incremental Topology Flushing: every flushInterval snapshots
    if (snapshots.length % flushInterval === 0 && snapshots.length > 0) {
      const end = snapshots.length;
      const start = end - flushInterval;
      const slice = transition_sequence.slice(start, end);
      const chunk_seq = slice.join('->');
      const windowHash = crypto.createHash('sha256').update(chunk_seq).digest('hex');
      const key = `window_${start}_${end}`;
      topology_windows[key] = windowHash;

      const frame = {
        start,
        end,
        window_hash: windowHash,
        snapshots: snapshots.slice(start, end)
      };
      process.stdout.write(`__ZTAN_TOPO_FRAME__:${JSON.stringify(frame)}\n`);
    }
  }

  let finalStatus: 'accept' | 'reject' | 'error' = 'accept';
  let errorMessage: string | undefined;

  recordSnapshot('init', { state: 'initialized' });

  try {
    for (let i = 0; i < chunksBase64.length; i++) {
      if (executionContract.entropy_profile?.async_chunk_jitter) {
        // Entropy Injection: Simulate asynchronous IO latency and event loop variance
        const intensity = executionContract.entropy_profile.jitter_intensity ?? executionContract.entropy_profile.intensity_factor ?? 1.0;
        const jitter = Math.random() * 2 * intensity;
        accumulatedJitter += jitter;
        await new Promise(r => setTimeout(r, jitter));
      }
      const chunk = Buffer.from(chunksBase64[i], 'base64').toString('utf-8');
      if (executionContract.entropy_profile?.scheduler_contention) {
        const stderrIntensity = executionContract.entropy_profile.stderr_flood_intensity ?? executionContract.entropy_profile.intensity_factor ?? 1.0;
        const linesToFlood = Math.floor(10 * stderrIntensity);
        for (let l = 0; l < linesToFlood; l++) {
          process.stderr.write(`[DEBUG] scheduler_contention flood line ${l} chunk ${i} latency_accumulated ${accumulatedJitter.toFixed(2)}ms\n`);
        }
      }
      total_payload_bytes += chunk.length;
      const startCount = snapshots.length;
      const tokens = tokenizer.write(chunk);
      
      for (const token of tokens) {
        validator.processTokens([token]);
        recordSnapshot('token_processed', {
          token_type: token.type,
          stack_depth: (validator as any).stack.length,
          expected_next: (validator as any).expectedNext,
          has_closed_root: (validator as any).hasClosedRoot
        }, {
          token_type: token.type,
          start: token.start,
          end: token.end,
          value: token.value
        });
      }
      
      snapshots_per_chunk.push(snapshots.length - startCount);
    }
    const finalTokens = tokenizer.end();
    for (const token of finalTokens) {
      validator.processTokens([token]);
      recordSnapshot('token_processed', {
        token_type: token.type,
        stack_depth: (validator as any).stack.length,
        expected_next: (validator as any).expectedNext,
        has_closed_root: (validator as any).hasClosedRoot
      }, {
        token_type: token.type,
        start: token.start,
        end: token.end,
        value: token.value
      });
    }
    validator.finalize();
    recordSnapshot('finalize', { completed: true });
  } catch (e: any) {
    finalStatus = 'reject';
    errorMessage = e.message;
    recordSnapshot('reject', { error: e.message });
  }

  const hashStart = performance.now();
  // Generate trace digest (hash of all snapshot hashes)
  const hashList = snapshots.map(s => s.hash).join('|');
  const trace_digest = crypto.createHash('sha256').update(hashList).digest('hex');
  const hashEnd = performance.now();
  telemetryOverheadTotalMs += (hashEnd - hashStart);

  // Generate topology fingerprint & windows
  const topoStart = performance.now();
  const topology_fingerprint = crypto.createHash('sha256').update(transition_sequence.join('->')).digest('hex');

  // Construct final leftover windows (if any)
  if (snapshots.length > 0 && snapshots.length % flushInterval !== 0) {
    const start = Math.floor(snapshots.length / flushInterval) * flushInterval;
    const end = snapshots.length;
    const slice = transition_sequence.slice(start, end);
    const chunk_seq = slice.join('->');
    const windowHash = crypto.createHash('sha256').update(chunk_seq).digest('hex');
    const key = `window_${start}_${end}`;
    topology_windows[key] = windowHash;

    const frame = {
      start,
      end,
      window_hash: windowHash,
      snapshots: snapshots.slice(start, end)
    };
    process.stdout.write(`__ZTAN_TOPO_FRAME__:${JSON.stringify(frame)}\n`);
  }
  const topoEnd = performance.now();
  const topology_hash_cpu_cost = topoEnd - topoStart;
  telemetryOverheadTotalMs += topology_hash_cpu_cost;

  // Snapshot memory cost estimation
  const memStart = performance.now();
  const snapshot_memory_cost = snapshots.reduce((acc, s) => acc + s.hash.length * 2 + s.transition_reason.length * 2 + 32, 0);
  const memEnd = performance.now();
  telemetryOverheadTotalMs += (memEnd - memStart);

  // Provenance Lineage tracking
  const provenance_lineage = {
    entropy_profile: executionContract.entropy_profile || null,
    transport_corruption_mode: executionContract.entropy_profile?.partial_stdout_truncation ? 'partial_stdout_truncation' : 'none',
    chunk_strategy: executionContract.chunk_strategy || null,
    jitter_profile: executionContract.entropy_profile?.async_chunk_jitter ? 'async_chunk_jitter' : 'none',
    stdout_strategy: executionContract.entropy_profile?.stdout_fragmentation ? 'stdout_fragmentation' : 'none',
    seed: executionContract.deterministic_seed || null
  };

  const endTime = performance.now();
  const wallClockMs = endTime - startTime;
  const wallClockSec = wallClockMs / 1000;

  const windowCount = Math.ceil(transition_sequence.length / 64);
  const telemetry_cost_per_snapshot = snapshots.length > 0 ? telemetryOverheadTotalMs / snapshots.length : 0;
  const topology_cost_per_window = windowCount > 0 ? topology_hash_cpu_cost / windowCount : 0;
  const memory_growth_per_transition = transition_sequence.length > 0 ? snapshot_memory_cost / transition_sequence.length : 0;

  // Pre-calculate telemetry frames
  const tempResponse: RuntimeResponse = {
    status: finalStatus,
    trace_digest,
    snapshots,
    topology_fingerprint,
    topology_windows,
    provenance_lineage,
    ...(errorMessage ? { error_message: errorMessage } : {}),
    metrics: {
      total_snapshots: snapshots.length,
      snapshots_per_chunk,
      snapshots_per_byte: total_payload_bytes > 0 ? snapshots.length / total_payload_bytes : 0,
      transition_density,
      snapshots_per_sec: 0,
      transitions_per_byte: total_payload_bytes > 0 ? snapshots.length / total_payload_bytes : 0,
      throughput_bytes_per_sec: 0,
      replay_wall_clock_ms: 0,
      chunk_stall_ms: accumulatedJitter,
      stdout_frame_count: 1,
      replay_memory_peak: process.memoryUsage().heapUsed,
      telemetry_overhead_ms: telemetryOverheadTotalMs,
      topology_hash_cpu_cost,
      snapshot_memory_cost,
      telemetry_frames_written: 1,
      telemetry_cost_per_snapshot,
      topology_cost_per_window,
      memory_growth_per_transition,
      serialization_cost_per_frame: telemetryOverheadTotalMs - topology_hash_cpu_cost
    }
  };

  const tempJson = JSON.stringify(tempResponse);
  let finalFramesWritten = 1;
  if (executionContract.entropy_profile?.stdout_fragmentation) {
    finalFramesWritten = Math.ceil(tempJson.length / 1024);
    if (executionContract.entropy_profile?.delayed_final_newline) {
      finalFramesWritten += 1;
    }
  } else if (executionContract.entropy_profile?.delayed_final_newline) {
    finalFramesWritten = 2;
  }

  const response: RuntimeResponse = {
    status: finalStatus,
    trace_digest,
    snapshots,
    topology_fingerprint,
    topology_windows,
    provenance_lineage,
    ...(errorMessage ? { error_message: errorMessage } : {}),
    metrics: {
      total_snapshots: snapshots.length,
      snapshots_per_chunk,
      snapshots_per_byte: total_payload_bytes > 0 ? snapshots.length / total_payload_bytes : 0,
      transition_density,
      snapshots_per_sec: wallClockSec > 0 ? snapshots.length / wallClockSec : 0,
      transitions_per_byte: total_payload_bytes > 0 ? snapshots.length / total_payload_bytes : 0,
      throughput_bytes_per_sec: wallClockSec > 0 ? total_payload_bytes / wallClockSec : 0,
      replay_wall_clock_ms: wallClockMs,
      chunk_stall_ms: accumulatedJitter,
      stdout_frame_count: finalFramesWritten,
      replay_memory_peak: process.memoryUsage().heapUsed,
      telemetry_overhead_ms: telemetryOverheadTotalMs,
      topology_hash_cpu_cost,
      snapshot_memory_cost,
      telemetry_frames_written: finalFramesWritten,
      telemetry_cost_per_snapshot,
      topology_cost_per_window,
      memory_growth_per_transition,
      serialization_cost_per_frame: finalFramesWritten > 0 ? (telemetryOverheadTotalMs - topology_hash_cpu_cost) / finalFramesWritten : 0
    }
  };

  let out = JSON.stringify(response);

  // Transport Perturbation: Partial Stdout Truncation
  if (executionContract.entropy_profile?.partial_stdout_truncation) {
    out = out.substring(0, Math.floor(out.length / 2));
  }

  // Transport Perturbation: Stdout Fragmentation
  if (executionContract.entropy_profile?.stdout_fragmentation) {
    const chunkSize = 1024;
    let offset = 0;
    while (offset < out.length) {
      const chunkStr = out.substring(offset, offset + chunkSize);
      process.stdout.write(chunkStr);
      offset += chunkSize;
    }
    if (executionContract.entropy_profile?.delayed_final_newline) {
      await new Promise(r => setTimeout(r, 10)); // Delay EOF newline
    }
    console.log();
  } else {
    // Transport Perturbation: Delayed Final Newline
    if (executionContract.entropy_profile?.delayed_final_newline) {
      process.stdout.write(out);
      await new Promise(r => setTimeout(r, 10)); // Delay EOF newline
      console.log();
    } else {
      console.log(out);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
