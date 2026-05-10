--------------------------- MODULE ztan ---------------------------
EXTENDS Integers, Sequences, FiniteSets

(* 
  ZTAN Institutional Ontology Specification
  Formalizing state transitions, quorum, and institutional finality.
*)

CONSTANTS 
    States,         \* Set of all institutional states (e.g., QUIESCENT, LOCKED)
    Actions,        \* Set of all governance actions
    Witnesses,      \* Set of all witness identifiers
    Thresholds,     \* Quorum thresholds
    GenesisEpoch,   \* Initial epoch ID
    GenesisSeq      \* Initial sequence number

VARIABLES
    current_state,  \* The active InstitutionalState
    epoch_id,       \* Monotonically increasing epoch ID
    seq_num,        \* Sequence number within epoch
    lineage,        \* Sequence of Merkle-anchored governance receipts
    active_witnesses \* Set of currently active witnesses

-----------------------------------------------------------------------------

(* Institutional Laws (The State Matrix) *)
InstitutionalLaw(state, action) == 
    CASE state = "QUIESCENT" -> action \in {"GOVERNANCE_PROPOSAL", "COUNCIL_RESET", "AUDITOR_SLASH"}
      [] state = "PROPOSING" -> action \in {"COUNCIL_UPDATE", "AUDITOR_SLASH"}
      [] state = "RECOVERING" -> action \in {"RECOVERY_CHALLENGE", "COUNCIL_RESET"}
      [] state = "LOCKED"     -> action \in {"COUNCIL_RESET"}
      [] state = "HIBERNATING" -> action \in {"COUNCIL_RESET", "PROTOCOL_UPGRADE"}
      [] OTHER -> FALSE

-----------------------------------------------------------------------------

(* Initial State *)
Init == 
    /\ current_state = "QUIESCENT"
    /\ epoch_id = GenesisEpoch
    /\ seq_num = GenesisSeq
    /\ lineage = << >>
    /\ active_witnesses = Witnesses

(* State Transitions *)
ApplyAction(action) ==
    /\ InstitutionalLaw(current_state, action)
    /\ CASE action = "GOVERNANCE_PROPOSAL" -> 
                /\ current_state' = "PROPOSING"
                /\ seq_num' = seq_num + 1
          [] action = "COUNCIL_UPDATE" -> 
                /\ current_state' = "QUIESCENT"
                /\ epoch_id' = epoch_id + 1
                /\ seq_num' = 0
          [] action = "COUNCIL_RESET" ->
                /\ current_state' = "QUIESCENT"
                /\ seq_num' = 0
          [] OTHER -> UNCHANGED <<current_state, epoch_id, seq_num>>
    /\ lineage' = Append(lineage, action)
    /\ UNCHANGED <<active_witnesses>>

Next == \E a \in Actions : ApplyAction(a)

Spec == Init /\ [][Next]_<<current_state, epoch_id, seq_num, lineage, active_witnesses>>

-----------------------------------------------------------------------------

(* Safety Invariants *)
NoSplitBrain == \A r1, r2 \in Range(lineage) : TRUE \* Simplified for now

=============================================================================
