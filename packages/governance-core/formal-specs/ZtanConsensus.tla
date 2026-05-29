---- MODULE ZtanConsensus ----
EXTENDS Integers, Sequences, FiniteSets

CONSTANTS Nodes, Commands

VARIABLES 
    nodeState,  \* [node |-> "FOLLOWER", "CANDIDATE", "LEADER"]
    currentTerm, \* [node |-> Nat]
    log,         \* [node |-> Sequence of Commands]
    preparePool, \* [node |-> Set of [term: Nat, root: String, nodeId: Node]]
    committed    \* Set of [term, command] globally committed

vars == <<nodeState, currentTerm, log, preparePool, committed>>

Init == 
    /\ nodeState = [n \in Nodes |-> "FOLLOWER"]
    /\ currentTerm = [n \in Nodes |-> 0]
    /\ log = [n \in Nodes |-> <<>>]
    /\ preparePool = [n \in Nodes |-> {}]
    /\ committed = {}

Quorum == (Cardinality(Nodes) \div 2) + 1

(* Transitions *)

BecomeCandidate(n) ==
    /\ nodeState[n] \in {"FOLLOWER", "CANDIDATE"}
    /\ nodeState' = [nodeState EXCEPT ![n] = "CANDIDATE"]
    /\ currentTerm' = [currentTerm EXCEPT ![n] = currentTerm[n] + 1]
    /\ UNCHANGED <<log, preparePool, committed>>

BecomeLeader(n) ==
    /\ nodeState[n] = "CANDIDATE"
    /\ nodeState' = [nodeState EXCEPT ![n] = "LEADER"]
    /\ UNCHANGED <<currentTerm, log, preparePool, committed>>

Propose(n, cmd) ==
    /\ nodeState[n] = "LEADER"
    /\ log' = [log EXCEPT ![n] = Append(log[n], [term |-> currentTerm[n], command |-> cmd])]
    /\ preparePool' = [preparePool EXCEPT ![n] = preparePool[n] \cup {[term |-> currentTerm[n], root |-> cmd, nodeId |-> n]}]
    /\ UNCHANGED <<nodeState, currentTerm, committed>>

FollowerPrepare(n, leader, cmd) ==
    /\ nodeState[n] = "FOLLOWER"
    /\ currentTerm[n] <= currentTerm[leader]
    /\ currentTerm' = [currentTerm EXCEPT ![n] = currentTerm[leader]]
    /\ log' = [log EXCEPT ![n] = Append(log[n], [term |-> currentTerm[leader], command |-> cmd])]
    /\ preparePool' = [preparePool EXCEPT ![n] = preparePool[n] \cup {[term |-> currentTerm[leader], root |-> cmd, nodeId |-> n]}]
    /\ UNCHANGED <<nodeState, committed>>

Commit(n) ==
    /\ Len(log[n]) > 0
    /\ LET head == log[n][Len(log[n])]
           prepares == {p \in preparePool[n] : p.term = head.term /\ p.root = head.command}
       IN Cardinality(prepares) >= Quorum
    /\ committed' = committed \cup {log[n][Len(log[n])]}
    /\ UNCHANGED <<nodeState, currentTerm, log, preparePool>>

Next == 
    \/ \E n \in Nodes : BecomeCandidate(n)
    \/ \E n \in Nodes : BecomeLeader(n)
    \/ \E n \in Nodes, c \in Commands : Propose(n, c)
    \/ \E n, l \in Nodes, c \in Commands : FollowerPrepare(n, l, c)
    \/ \E n \in Nodes : Commit(n)

Spec == Init /\ [][Next]_vars

(* INVARIANTS *)

QuorumIntersectionSafety ==
    \A c1, c2 \in committed :
        (c1.term = c2.term) => (c1.command = c2.command)

====
