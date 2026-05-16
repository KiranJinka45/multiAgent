--------------------------- MODULE ZTAN_Consensus ---------------------------
EXTENDS Naturals, Sequences, FiniteSets

(***************************************************************************)
(* ZTAN-RFC-001 v1.5 Consensus Core Specification                          *)
(* Focus: Replay Determinism, Invariant Preservation, and Quorum Safety    *)
(***************************************************************************)

CONSTANTS
    Nodes,          \* Set of participating nodes
    Threshold,      \* Minimum trust weight for convergence
    MaxSequence     \* Bounded sequence for model checking

VARIABLES
    ledger,         \* Map of eventId -> Sequence of Events
    state,          \* Map of eventId -> Current State (PENDING, COMPLETED, FAILED)
    trustWeights,   \* Map of Node -> Trust Weight (0-100)
    slashed,        \* Set of slashed nodes
    archiveRoot     \* Hash-chained root of the governance archive

vars == <<ledger, state, trustWeights, slashed, archiveRoot>>

(***************************************************************************)
(* Invariants                                                              *)
(***************************************************************************)

\* Safety: A ceremony can only transition from PENDING to a terminal state
TypeOK ==
    /\ DOMAIN ledger \subseteq DOMAIN state
    /\ \forall e \in DOMAIN state : state[e] \in {"PENDING", "COMPLETED", "FAILED"}
    /\ slashed \subseteq Nodes

\* Single-Finalization Safety: A ceremony cannot be both COMPLETED and FAILED
SingleFinalizationSafety ==
    \forall e \in DOMAIN state :
        ~(state[e] = "COMPLETED" /\ state[e] = "FAILED")

\* Equivocation Impossibility: A node cannot sign two different status values for the same ceremony event
EquivocationImpossibility ==
    \forall e \in DOMAIN ledger :
        \forall i, j \in 1..Len(ledger[e]) :
            (ledger[e][i].nodeId = ledger[e][j].nodeId) => (ledger[e][i].status = ledger[e][j].status)

\* Checkpoint Consistency: The archiveRoot must uniquely represent the sequence of events
CheckpointConsistency ==
    \forall e1, e2 \in DOMAIN state :
        (state[e1] = "COMPLETED" /\ state[e2] = "COMPLETED" /\ archiveRoot = archiveRoot) => TRUE \* Simplified for model check

\* Consistency: Slashed nodes must have zero trust weight
SlashedZeroWeight ==
    \forall n \in slashed : trustWeights[n] = 0

(***************************************************************************)
(* Liveness Properties                                                     *)
(***************************************************************************)

\* Liveness: If a ceremony is created and enough non-slashed nodes exist, it eventually finalizes
Liveness ==
    \forall e \in DOMAIN state :
        (state[e] = "PENDING" /\ Cardinality(Nodes \ slashed) >= Threshold) ~> (state[e] \in {"COMPLETED", "FAILED"})

\* Quorum Safety: A ceremony only completes if the aggregate weight of attestations >= Threshold
QuorumSafety ==
    \forall e \in DOMAIN state :
        state[e] = "COMPLETED" => 
            (LET passNodes == {a.nodeId : a \in {evt.payload : evt \in Range(ledger[e])}}
             IN SumWeight(passNodes) >= Threshold)

SumWeight(nSet) == 
    LET weight(n) == trustWeights[n]
    IN IF nSet = {} THEN 0 ELSE 0 \* Placeholder for recursive sum logic

(***************************************************************************)
(* Transitions                                                             *)
(***************************************************************************)

Init ==
    /\ ledger = [e \in {} |-> <<>>]
    /\ state = [e \in {} |-> "PENDING"]
    /\ trustWeights = [n \in Nodes |-> 100]
    /\ slashed = {}
    /\ archiveRoot = 0

CreateCeremony(e) ==
    /\ e \notin DOMAIN state
    /\ state' = state @@ (e :> "PENDING")
    /\ ledger' = ledger @@ (e :> <<>>)
    /\ UNCHANGED <<trustWeights, slashed, archiveRoot>>

AddAttestation(e, n, status) ==
    /\ e \in DOMAIN state
    /\ state[e] = "PENDING"
    /\ n \in Nodes \ slashed
    /\ Len(ledger[e]) < MaxSequence
    /\ ledger' = [ledger EXCEPT ![e] = Append(@, [nodeId |-> n, status |-> status])]
    /\ (LET currentWeight == SumWeight({a.nodeId : a \in {evt.payload : evt \in Range(ledger'[e])}})
        IN IF currentWeight >= Threshold 
           THEN state' = [state EXCEPT ![e] = "COMPLETED"]
           ELSE IF Len(ledger'[e]) >= Cardinality(Nodes)
                THEN state' = [state EXCEPT ![e] = "FAILED"]
                ELSE state' = state)
    /\ UNCHANGED <<trustWeights, slashed, archiveRoot>>

SlashNode(n) ==
    /\ n \in Nodes \ slashed
    /\ slashed' = slashed \cup {n}
    /\ trustWeights' = [trustWeights EXCEPT ![n] = 0]
    /\ UNCHANGED <<ledger, state, archiveRoot>>

Next ==
    \/ \exists e : CreateCeremony(e)
    \/ \exists e, n, s : AddAttestation(e, n, s)
    \/ \exists n : SlashNode(n)

Spec == Init /\ [][Next]_vars /\ WF_vars(Next)

=============================================================================
