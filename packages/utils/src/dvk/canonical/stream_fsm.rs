use crate::dvk::replay::snapshot::{ParserSnapshot, ParserState, TransitionReason, Utf8DecoderState};

/// Defines hard resource limits for replay observability telemetry
/// to prevent memory amplification during pathological fuzz paths.
pub const MAX_SNAPSHOTS_PER_PARSE: usize = 100_000;

pub struct StreamFsm {
    parser_state: ParserState,
    utf8_state: Utf8DecoderState,
    current_offset: usize,
    current_field: String,
    current_token: String,
    escape_active: bool,
    bytes_processed: usize,
    chunk_index: usize,

    #[cfg(feature = "snapshot-observability")]
    snapshots: Vec<ParserSnapshot>,
}

impl StreamFsm {
    pub fn new() -> Self {
        Self {
            parser_state: ParserState::Normal,
            utf8_state: Utf8DecoderState::Complete,
            current_offset: 0,
            current_field: String::new(),
            current_token: String::new(),
            escape_active: false,
            bytes_processed: 0,
            chunk_index: 0,

            #[cfg(feature = "snapshot-observability")]
            snapshots: Vec::with_capacity(128),
        }
    }

    #[cfg(feature = "snapshot-observability")]
    fn emit_snapshot(&mut self, reason: TransitionReason) {
        if self.snapshots.len() >= MAX_SNAPSHOTS_PER_PARSE {
            // Hard budget limit reached.
            return;
        }

        let snapshot = ParserSnapshot {
            reason,
            parser_state: self.parser_state.clone(),
            utf8_state: self.utf8_state.clone(),
            current_offset: self.current_offset,
            current_field: self.current_field.clone(),
            current_token: self.current_token.clone(),
            escape_active: self.escape_active,
            bytes_processed: self.bytes_processed,
            chunk_index: self.chunk_index,
        };
        self.snapshots.push(snapshot);
    }

    #[cfg(not(feature = "snapshot-observability"))]
    #[inline(always)]
    fn emit_snapshot(&mut self, _reason: TransitionReason) {}

    pub fn process_chunk(&mut self, chunk: &[u8]) {
        // HOOK: Chunk Ingress
        self.chunk_index += 1;
        self.emit_snapshot(TransitionReason::ChunkIngress);

        for &byte in chunk {
            self.bytes_processed += 1;

            // Simplified streaming UTF-8 and Escape logic for structural example
            match self.parser_state {
                ParserState::Normal => {
                    if byte == b'"' {
                        self.parser_state = ParserState::String;
                    }
                }
                ParserState::String => {
                    if self.escape_active {
                        // HOOK: Escape-state exit
                        self.escape_active = false;
                        self.emit_snapshot(TransitionReason::EscapeExit);
                    } else if byte == b'\\' {
                        // HOOK: Escape-state entry
                        self.escape_active = true;
                        self.emit_snapshot(TransitionReason::EscapeEnter);
                    } else if byte == b'"' {
                        self.parser_state = ParserState::Normal;
                    } else {
                        // HOOK: UTF-8 continuation transition simulation
                        // This would integrate with a real UTF-8 decoder state machine
                        if byte >= 0x80 {
                            if self.utf8_state == Utf8DecoderState::Complete {
                                self.utf8_state = Utf8DecoderState::AwaitingContinuation(1);
                                self.emit_snapshot(TransitionReason::Utf8ContinuationEnter);
                            } else {
                                self.utf8_state = Utf8DecoderState::Complete;
                                self.emit_snapshot(TransitionReason::Utf8ContinuationExit);
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    #[cfg(feature = "snapshot-observability")]
    pub fn take_snapshots(&mut self) -> Vec<ParserSnapshot> {
        std::mem::take(&mut self.snapshots)
    }
}
