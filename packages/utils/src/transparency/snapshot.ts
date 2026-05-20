import { createHash } from 'crypto';

export const SNAPSHOT_SCHEMA_VERSION = 1;

export enum ParserState {
    Normal = 'Normal',
    String = 'String',
    Literal = 'Literal',
    Reject = 'Reject',
}

export type Utf8DecoderState = 
    | { type: 'Complete' }
    | { type: 'AwaitingContinuation', pendingBytes: number }
    | { type: 'Invalid' };

export interface ParserSnapshot {
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
}

/**
 * Normalizes the Utf8DecoderState into a strictly canonical string representation
 * matching the Rust DVK exactly: "Complete", "AwaitingContinuation(N)", "Invalid".
 */
function canonicalizeUtf8State(state: Utf8DecoderState): string {
    switch (state.type) {
        case 'Complete':
            return 'Complete';
        case 'Invalid':
            return 'Invalid';
        case 'AwaitingContinuation':
            return `AwaitingContinuation(${state.pendingBytes})`;
    }
}

/**
 * Generates a deterministic semantic hash of the snapshot state.
 * Identical serialization logic as Rust DVK to ensure cross-runtime divergence bisecting.
 */
export function generateSemanticHash(snapshot: ParserSnapshot): string {
    // We use a deterministic delimited serialization format.
    // Excludes all heap addresses, allocation counts, and environment noise.
    // The format string explicitly aligns with the Rust macro: "v1|Normal|Complete|0|||false|0|0"
    const canonicalRepr = `v${SNAPSHOT_SCHEMA_VERSION}|${snapshot.parser_state}|${canonicalizeUtf8State(snapshot.utf8_state)}|${snapshot.current_offset}|${snapshot.current_field}|${snapshot.current_token}|${snapshot.escape_active}|${snapshot.bytes_processed}|${snapshot.chunk_index}`;

    return createHash('sha256').update(canonicalRepr).digest('hex');
}
