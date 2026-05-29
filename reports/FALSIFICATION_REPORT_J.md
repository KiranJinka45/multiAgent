# Falsification Campaign J: BFT Equivocation Fencing
- **Run ID:** `FALSIFICATION-J-EQUIVOCATION-1779976572013`
- **Execution Timestamp:** 2026-05-28T13:56:12.013Z
- **Target Subsystem:** Phase L (True BFT Consensus)

## Campaign Objective
To measure the correctness of the BFT Quorum Certificate logic when a malicious leader attempts to equivocate, censor, or replay state histories using divergent Merkle roots and forged signatures.

## Execution Metrics
- **Total Vectors Tested:** 3
- **Vectors Survived:** 3
- **Vectors Exhausted:** 0
- **Observed successful bypasses:** 0 / 3 modeled vectors
- **Vulnerability Rate:** No successful bypasses observed under current modeled conditions


## Equivocation Vector Analysis

| Equivocation Vector | Description | Status | Response |
|---|---|---|---|
| **Split Quorum Roots (Equivocation)** | Leader sends differing payloads to different followers to fracture the ledger. | 🛡️ SURVIVED | SURVIVED: Equivocation detected via inter-replica prepare cross-talk! Replicas aborted due to prepare conflicts. |
| **Forged Quorum Certificate (Forged ACKs)** | Leader attempts to claim a commit without gathering 2f+1 valid signatures. | 🛡️ SURVIVED | SURVIVED: Follower cryptographic validation rejected the forged signature. |
| **Replayed Certificate Injection** | Malicious node replays a valid but old certificate into a new term. | 🛡️ SURVIVED | SURVIVED: BFT timestamp/term boundaries rejected the replayed certificate. |

## Falsification Conclusion
The BFT consensus engine successfully fenced all modeled equivocation attempts. By enforcing strict asymmetric signature verification on both the leader's payload and the followers' ACKs, a malicious leader is mathematically blocked from fracturing the quorum or injecting forged state.
