# Federated Trust Containment Spec (V1.0)

## 1. The Principle of Isolation
In a federated institutional network, trust is interoperable but **Containable**. If one organization's governance continuity degrades or is compromised, the network must be able to isolate that organization to prevent "Trust Poisoning."

## 2. Containment Triggers
- **Lineage Discontinuity**: Gaps or unauthorized jumps in the historical governance record.
- **Interpretation Divergence**: Persistent inability for external auditors to reach the same conclusion during replay.
- **Anchor Drift**: Unauthorized deviation from the Global Trust Root.
- **Attestation Poisoning**: Injecting false or manipulative continuity metrics.

## 3. Quarantine States
| State | Description | Trust Weight |
| --- | --- | --- |
| **STABLE** | Optimal continuity and drift resistance. | 1.0 |
| **DEGRADED** | Minor drift or interpretation inconsistency. | 0.5 |
| **QUARANTINED** | Critical lineage failure or anchor drift. | 0.0 |

## 4. Containment Replay
All quarantine actions must be **Replayable**. Any institution can verify the evidence that led to a peer's isolation, ensuring that containment is not used for unauthorized exclusion.
