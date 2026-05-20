--------------------------- MODULE ztan ---------------------------
EXTENDS Integers, Sequences, FiniteSets

(*
  ZTAN v1.5.0-LTS Formal Specification with Concurrency & Replica Realism
  
  This formal model represents ZTAN's ultimate invariant-driven coordination:
  1. 4 Canonical States: READ_ONLY, REBUILDING, ACTIVE, QUARANTINED.
  2. Stepwise Reconstruction with Replica Lag: Rebuilding nodes synchronize from a lagging
     PostgreSQL read-replica (dbLedgerReplica) rather than the primary database directly,
     representing replication visibility delay.
  3. Interruption & Rollback: Rebuild abort cleanups revert only uncommitted, non-replicated
     local states to preserve consensus prefixes.
  4. Epoch-Aware Immutable Operations: Blocks explicitly carry the authoring lease generation
     epoch token, protecting commits against stale generation boundaries.
  5. Deterministic Byzantine Fracture Detection: inline timeline comparison that quarantines
     nodes when physical hash/payload divergence is detected against PostgreSQL.
  6. Compaction Sliding Window Anchor: Pruning historical blocks below compactedAnchor safely
     without deleting uncommitted outbox queue operations.
*)

CONSTANTS
    Nodes,         \* Set of active operator nodes (e.g., {"node-a", "node-b"})
    Partitions,    \* Set of logic partitions (e.g., {0, 1})
    MaxGen         \* Upper bound on generation counter to keep state space finite

VARIABLES
    dbLeaseOwner,      \* [Partitions -> Nodes \cup {"none"}]
    dbLeaseGen,        \* [Partitions -> Nat]
    dbLeaseExpired,    \* [Partitions -> BOOLEAN]
    dbLedger,          \* Primary PostgreSQL Consensus Ledger (Write Truth)
    dbLedgerReplica,   \* Lagging PostgreSQL Read-Replica Ledger (Read Target for Rebuild)
    dbDedupKeys,       \* Set of (partition, dedupId) committed in DB
    
    nodeState,         \* [Nodes -> [Partitions -> {"READ_ONLY", "REBUILDING", "ACTIVE", "QUARANTINED"}]]
    nodeLeaseGen,      \* [Nodes -> [Partitions -> Nat]]
    localLedger,       \* [Nodes -> [Partitions -> Seq(Block)]]
    outboxQueue,       \* [Nodes -> [Partitions -> Seq(Nat)]] (Sequence of local block indices pending sync)
    compactedAnchor    \* [Nodes -> [Partitions -> Nat]] (Sequence ID below which blocks have been pruned)

vars == <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys,
          nodeState, nodeLeaseGen, localLedger, outboxQueue, compactedAnchor>>

-----------------------------------------------------------------------------

(* Initial State Configuration *)
Init ==
    /\ dbLeaseOwner = [p \in Partitions \to "none"]
    /\ dbLeaseGen = [p \in Partitions \to 0]
    /\ dbLeaseExpired = [p \in Partitions \to FALSE]
    /\ dbLedger = << >>
    /\ dbLedgerReplica = << >>
    /\ dbDedupKeys = {}
    /\ nodeState = [n \in Nodes \to [p \in Partitions \to "READ_ONLY"]]
    /\ nodeLeaseGen = [n \in Nodes \to [p \in Partitions \to 0]]
    /\ localLedger = [n \in Nodes \to [p \in Partitions \to << >>]]
    /\ outboxQueue = [n \in Nodes \to [p \in Partitions \to << >>]]
    /\ compactedAnchor = [n \in Nodes \to [p \in Partitions \to 0]]

-----------------------------------------------------------------------------

(* 1. Lease Acquisition Ceremony
   Transitions a node from READ_ONLY to REBUILDING to force synchronous reconstruction. *)
AcquireLease(n, p) ==
    /\ nodeState[n][p] = "READ_ONLY"
    /\ (dbLeaseOwner[p] = "none" \/ dbLeaseExpired[p] \/ dbLeaseOwner[p] = n)
    /\ dbLeaseGen[p] < MaxGen
    /\ LET nextGen == dbLeaseGen[p] + 1 IN
        /\ dbLeaseOwner' = [dbLeaseOwner EXCEPT ![p] = n]
        /\ dbLeaseGen' = [dbLeaseGen EXCEPT ![p] = nextGen]
        /\ dbLeaseExpired' = [dbLeaseExpired EXCEPT ![p] = FALSE]
        /\ nodeLeaseGen' = [nodeLeaseGen EXCEPT ![n][p] = nextGen]
        /\ nodeState' = [nodeState EXCEPT ![n][p] = "REBUILDING"]
        /\ UNCHANGED <<dbLedger, dbLedgerReplica, dbDedupKeys, localLedger, outboxQueue, compactedAnchor>>

(* 2. Active Heartbeat Renewal *)
HeartbeatSuccess(n, p) ==
    /\ dbLeaseOwner[p] = n
    /\ ~dbLeaseExpired[p]
    /\ dbLeaseExpired' = [dbLeaseExpired EXCEPT ![p] = FALSE]
    /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, nodeLeaseGen, nodeState, dbLedger, dbLedgerReplica, dbDedupKeys, localLedger, outboxQueue, compactedAnchor>>

(* 3. Lease Heartbeat Failure (Self-Fencing Trigger)
   Couples ownership and validity: clears lease owner to "none" and resets node state. *)
HeartbeatTimeout(p) ==
    /\ dbLeaseOwner[p] /= "none"
    /\ ~dbLeaseExpired[p]
    /\ dbLeaseExpired' = [dbLeaseExpired EXCEPT ![p] = TRUE]
    /\ LET owner == dbLeaseOwner[p] IN
        /\ nodeState' = [nodeState EXCEPT ![owner][p] = "READ_ONLY"]
        /\ dbLeaseOwner' = [dbLeaseOwner EXCEPT ![p] = "none"]
        /\ UNCHANGED <<dbLeaseGen, nodeLeaseGen, dbLedger, dbLedgerReplica, dbDedupKeys, localLedger, outboxQueue, compactedAnchor>>

-----------------------------------------------------------------------------

(* 4. Database Replication (Replica Visibility Lag Loop)
   Asynchronously replicates committed blocks from the primary dbLedger to dbLedgerReplica. *)
SyncReplica(p) ==
    /\ Len(dbLedgerReplica) < Len(dbLedger)
    /\ LET nextIdx == Len(dbLedgerReplica) + 1 IN
        /\ dbLedgerReplica' = Append(dbLedgerReplica, dbLedger[nextIdx])
        /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbDedupKeys, nodeState, nodeLeaseGen, localLedger, outboxQueue, compactedAnchor>>

-----------------------------------------------------------------------------

(* 5. Synchronous Reconstruction (Step-by-step block replay & Rebuild)
   While in REBUILDING, the lease-holding node pulls historical blocks from dbLedgerReplica. *)
RebuildStep(n, p) ==
    /\ nodeState[n][p] = "REBUILDING"
    /\ dbLeaseOwner[p] = n
    /\ ~dbLeaseExpired[p]
    \* Sync strictly from the lagging Replica to model read-visibility delays
    /\ LET localCount == Len(localLedger[n][p])
           matchingReplicaBlocks == SelectSeq(dbLedgerReplica, lambda b: b.partition = p)
       IN
         /\ localCount < Len(matchingReplicaBlocks)
         /\ LET nextBlock == matchingReplicaBlocks[localCount + 1] IN
              /\ localLedger' = [localLedger EXCEPT ![n][p] = Append(localLedger[n][p], nextBlock)]
              /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeState, nodeLeaseGen, outboxQueue, compactedAnchor>>

(* Rebuild Interruption & Rollback
   If lease is stolen or lost during rebuild, reset to READ_ONLY and rollback local ledgers
   to contain only the strictly replayed database-consensus lineage. *)
RebuildInterrupted(n, p) ==
    /\ nodeState[n][p] = "REBUILDING"
    /\ (dbLeaseOwner[p] /= n \/ dbLeaseExpired[p])
    /\ nodeState' = [nodeState EXCEPT ![n][p] = "READ_ONLY"]
    /\ outboxQueue' = [outboxQueue EXCEPT ![n][p] = << >>]
    \* Discard divergent uncommitted local append blocks, preserving database-consensus truth
    /\ LET matchingDbBlocks == SelectSeq(dbLedger, lambda b: b.partition = p)
           durableCount == Len(matchingDbBlocks)
       IN
         localLedger' = [localLedger EXCEPT ![n][p] = SubSeq(localLedger[n][p], 1, durableCount)]
    /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeLeaseGen, compactedAnchor>>

(* Rebuild Completion
   Once local history matches Postgres consensus replica ledger length for this partition, transition to ACTIVE. *)
RebuildComplete(n, p) ==
    /\ nodeState[n][p] = "REBUILDING"
    /\ dbLeaseOwner[p] = n
    /\ ~dbLeaseExpired[p]
    /\ LET localCount == Len(localLedger[n][p])
           matchingReplicaBlocks == SelectSeq(dbLedgerReplica, lambda b: b.partition = p)
           matchingPrimaryBlocks == SelectSeq(dbLedger, lambda b: b.partition = p)
       IN
         \* Rebuild is complete only when node matches the full primary consensus ledger (replica has caught up)
         /\ localCount = Len(matchingPrimaryBlocks)
         /\ localCount = Len(matchingReplicaBlocks)
         /\ nodeState' = [nodeState EXCEPT ![n][p] = "ACTIVE"]
         /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeLeaseGen, localLedger, outboxQueue, compactedAnchor>>

-----------------------------------------------------------------------------

(* 6. Client Write Attempt (Local Append Phase with Causal Fencing)
   Appends carrying the authoring lease generation epoch token are queued in outbox. *)
LocalAppend(n, p, dedupId, payload) ==
    /\ nodeState[n][p] = "ACTIVE"
    /\ dbLeaseOwner[p] = n
    /\ ~dbLeaseExpired[p]
    /\ LET seqId == Len(localLedger[n][p]) + 1
           block == [seq == seqId, 
                     partition == p, 
                     dedup == dedupId, 
                     payload == payload,
                     epoch == nodeLeaseGen[n][p]] \* Epoch-Aware Immutable Operation
       IN
         /\ localLedger' = [localLedger EXCEPT ![n][p] = Append(localLedger[n][p], block)]
         /\ outboxQueue' = [outboxQueue EXCEPT ![n][p] = Append(outboxQueue[n][p], seqId)]
         /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeState, nodeLeaseGen, compactedAnchor>>

-----------------------------------------------------------------------------

(* 7. Transactional Outbox Flush (PostgreSQL Concurrency, Epoch Fencing, and ACK Ambiguity)
   Strictly rejects stale epoch tokens and models retry-convergence upon lost ACKs. *)
OutboxReconciliation(n, p) ==
    /\ nodeState[n][p] = "ACTIVE"
    /\ Len(outboxQueue[n][p]) > 0
    /\ LET seqId == Head(outboxQueue[n][p])
           block == localLedger[n][p][seqId] IN
        \* Verify active transactional fence and block epoch token validity
        IF dbLeaseGen[p] = nodeLeaseGen[n][p] /\ dbLeaseOwner[p] = n /\ ~dbLeaseExpired[p] /\ block.epoch = dbLeaseGen[p]
        THEN
            \* PostgreSQL Unique Deduplication Constraint check
            IF <p, block.dedup> \in dbDedupKeys
            THEN
                \* Idempotent Deduplication Hit: block already exists in DB, pop local queue
                /\ outboxQueue' = [outboxQueue EXCEPT ![n][p] = Tail(outboxQueue[n][p])]
                /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeState, nodeLeaseGen, localLedger, compactedAnchor>>
            ELSE
                \* Atomic database commit phase
                \/  \* Scenario A: Commit succeeds & ACK is received (Normal Case)
                    /\ dbLedger' = Append(dbLedger, block)
                    /\ dbDedupKeys' = dbDedupKeys \cup {<p, block.dedup>}
                    /\ outboxQueue' = [outboxQueue EXCEPT ![n][p] = Tail(outboxQueue[n][p])]
                    /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedgerReplica, nodeState, nodeLeaseGen, localLedger, compactedAnchor>>
                \/  \* Scenario B: Commit succeeds but ACK is lost (ACK Ambiguity Case)
                    \* Node retains the element in its local outboxQueue, triggering retry convergence.
                    /\ dbLedger' = Append(dbLedger, block)
                    /\ dbDedupKeys' = dbDedupKeys \cup {<p, block.dedup>}
                    /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedgerReplica, nodeState, nodeLeaseGen, localLedger, outboxQueue, compactedAnchor>>
        ELSE
            \* Stale transactional fence or epoch mismatch: step down to READ_ONLY immediately
            /\ nodeState' = [nodeState EXCEPT ![n][p] = "READ_ONLY"]
            /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeLeaseGen, localLedger, outboxQueue, compactedAnchor>>

-----------------------------------------------------------------------------

(* 8. Local Ledger Compaction
   Truncates historical blocks below the compaction boundary, but strictly 
   preserves uncommitted outbox queue blocks and the sliding window anchor. *)
LocalCompaction(n, p) ==
    /\ nodeState[n][p] = "ACTIVE"
    /\ Len(localLedger[n][p]) > 0
    \* Compaction can only occur up to the last block that is NOT currently pending in the outbox
    /\ LET maxSafeSeq == IF Len(outboxQueue[n][p]) > 0 
                         THEN Head(outboxQueue[n][p]) - 1
                         ELSE Len(localLedger[n][p])
       IN
         /\ maxSafeSeq > compactedAnchor[n][p]
         /\ compactedAnchor' = [compactedAnchor EXCEPT ![n][p] = maxSafeSeq]
         /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeState, nodeLeaseGen, localLedger, outboxQueue>>

-----------------------------------------------------------------------------

(* 9. Byzantine Divergence Detection Trigger
   A node scans its local ledger and discovers a sequence mismatch or hash fracture
   against PostgreSQL consensus storage blocks, triggering a quarantine state transition. *)
DetectByzantineDrift(n, p) ==
    /\ nodeState[n][p] \in {"ACTIVE", "REBUILDING"}
    /\ \E i \in (compactedAnchor[n][p] + 1)..Len(localLedger[n][p]) :
         /\ i <= Len(dbLedger)
         /\ dbLedger[i].partition = p
         /\ localLedger[n][p][i] /= dbLedger[i] \* Byzantine payload / ordering / epoch fracture detected!
    /\ nodeState' = [nodeState EXCEPT ![n][p] = "QUARANTINED"]
    /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeLeaseGen, localLedger, outboxQueue, compactedAnchor>>

(* 10. Manual HSM Quorum Ceremony Release
   Operational release relies on cryptographic multi-sig consensus among operator keys. *)
ManualQuarantineRelease(n, p) ==
    /\ nodeState[n][p] = "QUARANTINED"
    /\ nodeState' = [nodeState EXCEPT ![n][p] = "READ_ONLY"]
    /\ outboxQueue' = [outboxQueue EXCEPT ![n][p] = << >>] \* Clear outbox to break deadlock
    /\ UNCHANGED <<dbLeaseOwner, dbLeaseGen, dbLeaseExpired, dbLedger, dbLedgerReplica, dbDedupKeys, nodeLeaseGen, localLedger, compactedAnchor>>

-----------------------------------------------------------------------------

(* Master Transition Rules *)
Next ==
    \/ \E p \in Partitions : SyncReplica(p)
    \/ \E n \in Nodes :
        \E p \in Partitions :
            \/ AcquireLease(n, p)
            \/ HeartbeatSuccess(n, p)
            \/ HeartbeatTimeout(p)
            \/ RebuildStep(n, p)
            \/ RebuildInterrupted(n, p)
            \/ RebuildComplete(n, p)
            \/ \E d \in 1..MaxGen : LocalAppend(n, p, d, "Payload")
            \/ OutboxReconciliation(n, p)
            \/ LocalCompaction(n, p)
            \/ DetectByzantineDrift(n, p)
            \/ ManualQuarantineRelease(n, p)

Spec == Init /\ [][Next]_vars

=============================================================================
