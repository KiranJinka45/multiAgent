use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::io::{self, Read, Write};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use utils_rs::dvk::canonical::stream_fsm::StreamFsm;
use utils_rs::dvk::replay::snapshot::ParserSnapshot;

#[derive(Deserialize, Serialize)]
struct Envelope {
    replay_id: String,
    contract: Contract,
    chunks: Vec<String>,
}

#[derive(Deserialize, Serialize)]
struct Contract {
    corpus_id: String,
    deterministic_seed: String,
    topology_flush_interval: Option<usize>,
    entropy_profile: Option<EntropyProfile>,
}

#[derive(Deserialize, Serialize)]
struct EntropyProfile {
    async_chunk_jitter: Option<bool>,
    jitter_intensity: Option<f64>,
    stdout_fragmentation: Option<bool>,
    backpressure_intensity: Option<f64>,
    scheduler_contention: Option<bool>,
    stderr_flood_intensity: Option<f64>,
    partial_stdout_truncation: Option<bool>,
    descriptor_exhaustion: Option<bool>,
}

#[derive(Clone, Serialize)]
struct SnapshotTelemetry {
    sequence_index: usize,
    hash: String,
    transition_reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    metadata: Option<Value>,
}

#[derive(Serialize)]
struct SnapshotMetrics {
    total_snapshots: usize,
    snapshots_per_chunk: Vec<usize>,
    snapshots_per_byte: f64,
    transition_density: std::collections::HashMap<String, usize>,
}

#[derive(Serialize)]
struct RuntimeResponse {
    status: String,
    trace_digest: String,
    snapshots: Vec<SnapshotTelemetry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    metrics: Option<SnapshotMetrics>,
    #[serde(skip_serializing_if = "Option::is_none")]
    topology_fingerprint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    topology_windows: Option<std::collections::HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    provenance_lineage: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct TopoFrame {
    start: usize,
    end: usize,
    window_hash: String,
    snapshots: Vec<SnapshotTelemetry>,
}

fn compute_hash(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

pub fn main() {
    let mut stdin_str = String::new();
    if io::stdin().read_to_string(&mut stdin_str).is_err() {
        std::process::exit(1);
    }

    if stdin_str.trim().is_empty() {
        std::process::exit(0);
    }

    let envelope: Envelope = match serde_json::from_str(&stdin_str) {
        Ok(env) => env,
        Err(e) => {
            let err_res = RuntimeResponse {
                status: "error".to_string(),
                trace_digest: "".to_string(),
                snapshots: vec![],
                error_message: Some(format!("Invalid envelope: {}", e)),
                metrics: None,
                topology_fingerprint: None,
                topology_windows: None,
                provenance_lineage: None,
            };
            println!("{}", serde_json::to_string(&err_res).unwrap());
            std::process::exit(1);
        }
    };

    let flush_interval = match envelope.contract.topology_flush_interval {
        Some(val) => if val == 0 { 64 } else { val },
        None => 64,
    };

    let mut fsm = StreamFsm::new();
    let mut final_status = "accept".to_string();
    let mut error_message = None;
    let mut total_payload_bytes = 0;
    let mut snapshots_per_chunk = Vec::new();

    let mut all_snapshots = Vec::new();
    let mut transition_sequence = Vec::new();
    let mut topology_windows = std::collections::HashMap::new();
    let mut transition_density = std::collections::HashMap::new();

    // Entropy simulation: Descriptor leak in child (for coverage)
    let mut leaked_files = Vec::new();
    if let Some(ref ep) = envelope.contract.entropy_profile {
        if ep.descriptor_exhaustion.unwrap_or(false) {
            for _ in 0..100 {
                if let Ok(f) = std::fs::File::open("Cargo.toml") {
                    leaked_files.push(f);
                }
            }
        }
    }

    for (chunk_idx, chunk_b64) in envelope.chunks.into_iter().enumerate() {
        // Decode chunk from base64
        let chunk_bytes = match STANDARD.decode(&chunk_b64) {
            Ok(b) => b,
            Err(e) => {
                final_status = "error".to_string();
                error_message = Some(format!("Base64 decode failed for chunk {}: {}", chunk_idx, e));
                break;
            }
        };

        total_payload_bytes += chunk_bytes.len();
        
        let start_len = all_snapshots.len();

        fsm.process_chunk(&chunk_bytes);

        #[cfg(feature = "snapshot-observability")]
        {
            let chunk_snaps = fsm.take_snapshots();
            for snap in chunk_snaps {
                let snap_hash = snap.semantic_hash();
                let reason_str = format!("{:?}", snap.reason);
                let sequence_entry = format!("{}:{}", reason_str, snap_hash);
                
                *transition_density.entry(reason_str.clone()).or_insert(0) += 1;

                let metadata = json!({
                    "parser_state": format!("{:?}", snap.parser_state),
                    "escape_active": snap.escape_active,
                    "bytes_processed": snap.bytes_processed,
                });

                let telemetry = SnapshotTelemetry {
                    sequence_index: all_snapshots.len(),
                    hash: snap_hash,
                    transition_reason: reason_str,
                    metadata: Some(metadata),
                };
                
                all_snapshots.push(telemetry);
                transition_sequence.push(sequence_entry);

                // Incremental Topology Flushing: every flush_interval snapshots
                if all_snapshots.len() % flush_interval == 0 && !all_snapshots.is_empty() {
                    let end = all_snapshots.len();
                    let start = end - flush_interval;
                    let slice = &transition_sequence[start..end];
                    let chunk_seq = slice.join("->");
                    let window_hash = compute_hash(&chunk_seq);
                    
                    let key = format!("window_{}_{}", start, end);
                    topology_windows.insert(key, window_hash.clone());

                    // Frame serialization
                    let frame = TopoFrame {
                        start,
                        end,
                        window_hash,
                        snapshots: all_snapshots[start..end].to_vec(),
                    };

                    if let Ok(frame_json) = serde_json::to_string(&frame) {
                        println!("__ZTAN_TOPO_FRAME__:{}", frame_json);
                        let _ = io::stdout().flush();
                    }
                }
            }
        }

        snapshots_per_chunk.push(all_snapshots.len() - start_len);
    }

    let mut hash_list = String::new();
    for snap in &all_snapshots {
        hash_list.push_str(&snap.hash);
        hash_list.push('|');
    }
    let trace_digest = compute_hash(&hash_list);

    let topology_fingerprint = if !transition_sequence.is_empty() {
        let full_seq = transition_sequence.join("->");
        Some(compute_hash(&full_seq))
    } else {
        None
    };

    // Construct final leftover windows (if any)
    if !all_snapshots.is_empty() && all_snapshots.len() % flush_interval != 0 {
        let start = (all_snapshots.len() / flush_interval) * flush_interval;
        let end = all_snapshots.len();
        let slice = &transition_sequence[start..end];
        let chunk_seq = slice.join("->");
        let window_hash = compute_hash(&chunk_seq);
        let key = format!("window_{}_{}", start, end);
        topology_windows.insert(key, window_hash.clone());
        
        let frame = TopoFrame {
            start,
            end,
            window_hash,
            snapshots: all_snapshots[start..end].to_vec(),
        };

        if let Ok(frame_json) = serde_json::to_string(&frame) {
            println!("__ZTAN_TOPO_FRAME__:{}", frame_json);
            let _ = io::stdout().flush();
        }
    }

    let metrics = Some(SnapshotMetrics {
        total_snapshots: all_snapshots.len(),
        snapshots_per_chunk,
        snapshots_per_byte: if total_payload_bytes > 0 {
            (all_snapshots.len() as f64) / (total_payload_bytes as f64)
        } else {
            0.0
        },
        transition_density,
    });

    let provenance_lineage = serde_json::json!({
        "entropy_profile": envelope.contract.entropy_profile,
        "seed": envelope.contract.deterministic_seed,
    });

    let response = RuntimeResponse {
        status: final_status,
        trace_digest,
        snapshots: all_snapshots,
        error_message,
        metrics,
        topology_fingerprint,
        topology_windows: Some(topology_windows),
        provenance_lineage: Some(provenance_lineage),
    };

    if let Ok(json) = serde_json::to_string(&response) {
        println!("{}", json);
        let _ = io::stdout().flush();
    }
}
