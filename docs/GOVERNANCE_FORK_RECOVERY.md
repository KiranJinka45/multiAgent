# Governance Fork Recovery Spec (v1.0)

## 1. Objective
Ensure the global ZTAN network can autonomously identify and resolve divergent governance roots (forks) without centralized intervention, maintaining cryptographic finality even in the presence of rogue institutions.

## 2. Fork Detection Invariants
A **Governance Fork** is detected when the local `GossipNode` receives multiple signed root updates for the same `(federationId, epochId)` that differ in their `rootHash`.

- **Invariant 1**: Conflicting roots must be cryptographically signed by the same institutional identity.
- **Invariant 2**: Detection must trigger an immediate **Isolation Event** for the divergent federation.

## 3. Automated Recovery Pipeline

### A. Isolation (T=0)
- The federation involved in the fork is suspended.
- No new evidence packets from this federation are accepted for verification.
- Bridge throughput for the rogue peer is dropped to zero.

### B. Slashing Evidence (T+1)
- The detector generates a **Slashing Proof** containing both conflicting roots.
- This proof is gossiped with priority across the global network.

### C. Resolution & Pruning (T+N)
- Nodes verify the Slashing Proof.
- The rogue root (the one not matching the previous epoch's lineage) is pruned.
- The institution is permanently **BLACKLISTED** and removed from the `TrustAnchorRegistry`.

## 4. Safety Guarantees
- **Non-Equivocation**: It is mathematically impossible for an institution to recover once a fork is detected and verified.
- **Proof-Led Consensus**: Convergence is achieved not through voting, but through undeniable cryptographic evidence.

---
*Status: Draft V1.0 - ZTAN V2.1 Safety Layer*
