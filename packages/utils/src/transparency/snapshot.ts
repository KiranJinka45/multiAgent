import { createHash } from 'crypto';

export const SNAPSHOT_SCHEMA_VERSION = 1;

export enum ParserState {
    Normal = 'Normal',
    String = 'String',
    Literal = 'Literal',
    Reject = 'Reject',
}

function getParserStateGrammar(state: ParserState): string {
    return `STATE:${state}`;
}

export type Utf8DecoderState = 
    | { type: 'Complete' }
    | { type: 'AwaitingContinuation', pendingBytes: number }
    | { type: 'Invalid' };

/**
 * Normalizes the Utf8DecoderState into a strictly canonical string representation
 * matching the Rust DVK exactly: "UTF8:Complete", "UTF8:AwaitingContinuation:1", "UTF8:Invalid".
 */
function getUtf8StateGrammar(state: Utf8DecoderState): string {
    switch (state.type) {
        case 'Complete':
            return 'UTF8:Complete';
        case 'Invalid':
            return 'UTF8:Invalid';
        case 'AwaitingContinuation':
            return `UTF8:AwaitingContinuation:${state.pendingBytes}`;
    }
}

export enum TransitionReason {
    ChunkIngress = 'ChunkIngress',
    Utf8ContinuationEnter = 'Utf8ContinuationEnter',
    Utf8ContinuationExit = 'Utf8ContinuationExit',
    EscapeEnter = 'EscapeEnter',
    EscapeExit = 'EscapeExit',
    FsmReject = 'FsmReject',
}

function getReasonGrammar(reason: TransitionReason): string {
    return `REASON:${reason}`;
}

export interface ParserSnapshot {
    reason: TransitionReason;
    parser_state: ParserState;
    utf8_state: Utf8DecoderState;
    current_offset: number;
    current_field: string;
    current_token: string;
    escape_active: boolean;
    bytes_processed: number;
    chunk_index: number;
}

export interface ReplayArtifact {
    schema_version: number;
    runtime: string;
    seed: string;
    chunks: string[];
    snapshots: ParserSnapshot[];
    final_state: ParserState;
    result: string;
    first_divergence_snapshot_index?: number;
}

/**
 * Generates a deterministic semantic hash of the snapshot state.
 * Identical serialization logic as Rust DVK to ensure cross-runtime divergence bisecting.
 */
export function generateSemanticHash(snapshot: ParserSnapshot): string {
    // We use a deterministic delimited serialization format.
    // Excludes all heap addresses, allocation counts, and environment noise.
    // The format string explicitly aligns with the Rust macro exactly.
    const canonicalRepr = `v${SNAPSHOT_SCHEMA_VERSION}|${getReasonGrammar(snapshot.reason)}|${getParserStateGrammar(snapshot.parser_state)}|${getUtf8StateGrammar(snapshot.utf8_state)}|${snapshot.current_offset}|${snapshot.current_field}|${snapshot.current_token}|${snapshot.escape_active}|${snapshot.bytes_processed}|${snapshot.chunk_index}`;

    return createHash('sha256').update(canonicalRepr).digest('hex');
}
