use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const SNAPSHOT_SCHEMA_VERSION: u16 = 1;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ParserState {
    Normal,
    String,
    Literal,
    Reject,
}

impl ParserState {
    pub fn canonical_grammar(&self) -> &'static str {
        match self {
            ParserState::Normal => "STATE:Normal",
            ParserState::String => "STATE:String",
            ParserState::Literal => "STATE:Literal",
            ParserState::Reject => "STATE:Reject",
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Utf8DecoderState {
    Complete,
    AwaitingContinuation(u8),
    Invalid,
}

impl Utf8DecoderState {
    pub fn canonical_grammar(&self) -> String {
        match self {
            Utf8DecoderState::Complete => "UTF8:Complete".to_string(),
            Utf8DecoderState::Invalid => "UTF8:Invalid".to_string(),
            Utf8DecoderState::AwaitingContinuation(n) => format!("UTF8:AwaitingContinuation:{}", n),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum TransitionReason {
    ChunkIngress,
    Utf8ContinuationEnter,
    Utf8ContinuationExit,
    EscapeEnter,
    EscapeExit,
    FsmReject,
}

impl TransitionReason {
    pub fn canonical_grammar(&self) -> &'static str {
        match self {
            TransitionReason::ChunkIngress => "REASON:ChunkIngress",
            TransitionReason::Utf8ContinuationEnter => "REASON:Utf8ContinuationEnter",
            TransitionReason::Utf8ContinuationExit => "REASON:Utf8ContinuationExit",
            TransitionReason::EscapeEnter => "REASON:EscapeEnter",
            TransitionReason::EscapeExit => "REASON:EscapeExit",
            TransitionReason::FsmReject => "REASON:FsmReject",
        }
    }
}

/// A purely observational snapshot of the parser state at a given chunk boundary.
/// Capturing this snapshot MUST NEVER mutate the parser or influence execution paths.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ParserSnapshot {
    pub reason: TransitionReason,
    pub parser_state: ParserState,
    pub utf8_state: Utf8DecoderState,
    pub current_offset: usize,
    pub current_field: String,
    pub current_token: String,
    pub escape_active: bool,
    pub bytes_processed: usize,
    pub chunk_index: usize,
}

impl ParserSnapshot {
    /// Generates a deterministic semantic hash of the snapshot state.
    /// This normalizes cross-runtime differences into a stable semantic representation
    /// for rapid bisecting, clustering, and differential comparison.
    pub fn semantic_hash(&self) -> String {
        // We use a deterministic delimited serialization format to prevent
        // field-boundary ambiguity (e.g., offset 12 and field "34" vs offset 1 and field "234").
        // Excludes all heap addresses, allocation counts, and environment noise.
        let canonical_repr = format!(
            "v{}|{}|{}|{}|{}|{}|{}|{}|{}|{}",
            SNAPSHOT_SCHEMA_VERSION,
            self.reason.canonical_grammar(),
            self.parser_state.canonical_grammar(),
            self.utf8_state.canonical_grammar(),
            self.current_offset,
            self.current_field,
            self.current_token,
            self.escape_active,
            self.bytes_processed,
            self.chunk_index
        );

        let mut hasher = Sha256::new();
        hasher.update(canonical_repr.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

/// The standard determinist replay artifact.
/// This acts as a reproducible scientific record of a fuzzing divergence.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReplayArtifact {
    pub schema_version: u16,
    pub runtime: String,
    pub seed: String,
    pub chunks: Vec<String>,
    pub snapshots: Vec<ParserSnapshot>,
    pub final_state: ParserState,
    pub result: String,
}
