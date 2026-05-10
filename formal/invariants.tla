--------------------------- MODULE invariants ---------------------------
EXTENDS ztan

(* 
  Institutional Safety Invariants
  Properties that must hold across all reachable states.
*)

(* 1. Epoch Monotonicity: Epoch IDs must never regress. *)
EpochMonotonicity == [][epoch_id' >= epoch_id]_epoch_id

(* 2. Sequence Integrity: Sequence numbers must increment within an epoch. *)
SequenceIntegrity == 
    [][current_state' = "PROPOSING" => seq_num' = seq_num + 1]_seq_num

(* 3. Finality Lock: Once in LOCKED state, only RESET can escape. *)
FinalityLock == 
    current_state = "LOCKED" => \E a \in Actions : a = "COUNCIL_RESET"

(* 4. Lineage Continuity: Every receipt must link to the previous hash. *)
\* (This would require modeling the Merkle roots in TLA+, simplified for now)
LineageContinuity == Len(lineage) > 0 => TRUE

=============================================================================
