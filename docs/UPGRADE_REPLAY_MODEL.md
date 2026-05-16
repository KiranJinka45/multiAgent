# Upgrade Replay Model (V1.0)

## 1. Cross-Boundary Determinism
The hardest part of constitutional evolution is maintaining **Determinism** across policy boundaries. The Upgrade Replay Model ensures that an auditor replaying history can seamlessly transition between policy contexts.

## 2. The Migration Proof
A migration proof is a cryptographic anchor that links the final state hash of Policy V(n) to the initial state hash of Policy V(n+1).

## 3. Replay Contexts
During replay, the engine maintains a stack of active policies:
- **Historical Events**: Replayed using the policy active at the time of the event.
- **Upgrade Event**: Replayed using the *previous* policy's upgrade rules.
- **Post-Upgrade Events**: Replayed using the *new* policy.

## 4. Continuity Guarantee
If a lineage is re-certified post-upgrade, it implies that the **Continuity Chain** from the Genesis Root to the current state remains unbroken and verifiable.
