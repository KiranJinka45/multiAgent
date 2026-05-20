mod canonical;
mod replay;

use canonical::stream_fsm::StreamFsm;

fn main() {
    let mut fsm = StreamFsm::new();

    // Chunk 1: Start a string and an escape
    let chunk1 = b"\"Hello\\";
    fsm.process_chunk(chunk1);

    // Chunk 2: Finish escape and string
    let chunk2 = b"nWorld\"";
    fsm.process_chunk(chunk2);

    let snapshots = fsm.take_snapshots();
    
    println!("Total Snapshots Captured: {}", snapshots.len());
    for (i, snap) in snapshots.iter().enumerate() {
        println!("Snapshot {:02}: Hash -> {}", i, snap.semantic_hash());
        println!("   State: Parser={:?}, UTF8={:?}, Escape={}, Offset={}, Chunk={}",
            snap.parser_state, snap.utf8_state, snap.escape_active, snap.current_offset, snap.chunk_index);
    }
}
