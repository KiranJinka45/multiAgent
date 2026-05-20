--------------------------- MODULE invariants ---------------------------
EXTENDS ztan

(*
  ZTAN Deep Safety Invariants with Concurrency & Replica Realism
  
  Formal properties that must hold across all reachable states in our consolidated
  4-state PlusCal / TLA+ model.
  
  [BOUNDS NOTE] All safety claims and model checks are bounded under finite state-space
  limits (MaxGen) to ensure state decidability.
*)

(* 1. Authoritative Deduplication Invariant:
   PostgreSQL unique constraint on (partitionId, deduplicationId) guarantees 
   that no two ledger blocks can exist with the same deduplication identifier on the same partition. *)
NoDoubleCommit ==
    \A i, j \in 1..Len(dbLedger) :
        (i /= j /\ dbLedger[i].partition = dbLedger[j].partition) => 
            dbLedger[i].dedup /= dbLedger[j].dedup

(* 2. Transactional Lease Fencing Invariant:
   If a node attempts to write/flush to the database ledger, its lease generation must be 
   authoritatively matched with the active database lease generation. Stale nodes lose write legitimacy. *)
LeaseStalenessProtection ==
    \A n \in Nodes :
        \A p \in Partitions :
            (nodeState[n][p] = "ACTIVE" /\ dbLeaseOwner[p] = n) => 
                nodeLeaseGen[n][p] = dbLeaseGen[p]

(* 3. Strict Write Isolation for Non-Active Nodes:
   Nodes in READ_ONLY, REBUILDING, or QUARANTINED states are strictly blocked 
   from committing new mutations to the consensus database store. *)
NonActiveNodesCannotWrite ==
    \A n \in Nodes :
        \A p \in Partitions :
            nodeState[n][p] \in {"READ_ONLY", "REBUILDING", "QUARANTINED"} =>
                nodeLeaseGen[n][p] /= dbLeaseGen[p] \/ dbLeaseOwner[p] /= n \/ dbLeaseExpired[p]

(* 4. Compaction Sliding Boundary Safety:
   A node must never compact its local ledger beyond the sequence index of its uncommitted 
   outbox queue elements, preserving cryptographic hash chains for pending sync blocks. *)
CompactionSafety ==
    \A n \in Nodes :
        \A p \in Partitions :
            nodeState[n][p] = "ACTIVE" =>
                /\ compactedAnchor[n][p] <= Len(localLedger[n][p])
                /\ \A seq \in 1..Len(outboxQueue[n][p]) :
                     compactedAnchor[n][p] < outboxQueue[n][p][seq]

(* 5. Synchronous Reconstruction Suffix-Lineage Equivalence:
   If a node successfully transitions to ACTIVE, its local ledger must have absolute
   ordering, payload, epoch, and sequence lineage equivalence above the local compacted anchor
   against the PostgreSQL consensus ledger.
   (Ensures absolute lineage equivalence is fully compatible with sliding compacted ranges). *)
ReconstructionParity ==
    \A n \in Nodes :
        \A p \in Partitions :
            nodeState[n][p] = "ACTIVE" =>
                LET matchingDbBlocks == SelectSeq(dbLedger, lambda b: b.partition = p)
                    anchor == compactedAnchor[n][p]
                IN
                  /\ Len(localLedger[n][p]) >= Len(matchingDbBlocks)
                  \* Suffix-equivalent lineage verification above the compacted anchor
                  /\ \A i \in (anchor + 1)..Len(matchingDbBlocks) :
                       localLedger[n][p][i] = matchingDbBlocks[i]

(* 6. Quarantine Containment:
   If a node's partition state is QUARANTINED, no new writes from this node's outbox 
   are permitted to modify the PostgreSQL database ledger. *)
QuarantineContainment ==
    \A n \in Nodes :
        \A p \in Partitions :
            nodeState[n][p] = "QUARANTINED" =>
                nodeLeaseGen[n][p] /= dbLeaseGen[p] \/ dbLeaseOwner[p] /= n

=============================================================================
