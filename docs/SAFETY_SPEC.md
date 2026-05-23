# ZTAN Institutional Safety Specification (v1.0-FORMAL)

## 1. The Forbidden State Doctrine

Institutional safety in ZTAN is defined by the **algorithmic mitigation** of entering an illegal constitutional state. This specification formalizes the "Forbidden State" philosophy into a machine-enforceable safety model.

### 1.1 Existential Gatekeeping
The `validateTransitionSafety()` function acts as the primary validation gatekeeper for enforcing the defined state transitions. In operational terms, it validates that all proposed state changes conform to the rules enumerated in the state matrix.

## 2. Authoritative Legal Runtime (ALR)

The institutional laws are encoded in `formal/STATE_MATRIX.json`. 

### 2.1 Normative Interpretation
- The `STATE_MATRIX.json` SHALL be interpreted as the **exclusive and exhaustive** definition of legal institutional transitions.
- Any runtime behavior inconsistent with the matrix is treated as an invalid state transition and MUST trigger an operational exception or safety recovery protocol.
- **Schema Invariants**: The matrix must specify `states`, `actions`, `transitions`, and `invariants`. Wildcards and ambiguous transition edges are strictly prohibited.

### 2.2 Determinism & Ordering
The matrix must use canonical JSON ordering (alphabetical keys) to ensure identical hash roots across heterogeneous auditors.

## 3. Definition of Illegal Institutional State

A state is considered **Illegal** and MUST be rejected by any compliant runtime if it violates any of the following global invariants:

1.  **Unreachable State**: Any state not defined in the ALR or reachable from Genesis via legal edges.
2.  **Ambiguous Quorum**: Any state where two conflicting governance quorums could simultaneously claim validity.
3.  **Lineage Breach**: Any state where `previousGRoot` does not match the preceding receipt's `gRoot`.
4.  **Sequence Non-Monotonicity**: Any state where `sequenceNumber` or `epochId` regresses or skips required increments.
5.  **Constitutional Inconsistency**: Any state where the runtime policy deviates from the `CONSTITUTIONAL_ROOT` without valid witness ratification (conforming to the active consensus policy, such as a standard BFT quorum or emergency recovery overrides, to prevent irreversible governance deadlock).

## 4. Temporal Safety Semantics

The ZTAN runtime MUST enforce temporal invariants to ensure governance finality and recovery legitimacy:

1.  **Challenge Window Immutability**: No `COUNCIL_RESET` action shall be finalized before the `recoveryChallengeWindowMs` has expired.
2.  **Recovery Rate-Limiting**: The interval between successful recoveries MUST NOT be less than `minRecoveryIntervalMs`.
3.  **Stale State Locking**: An institution SHALL enter `LOCKED` state if heartbeat evidence fails to stabilize within the `recoveryInactivityThreshold`.

## 5. Constitutional Precedence Hierarchy

In the event of authority conflicts, the following precedence order SHALL be enforced:

1.  **Immutable Constitutional Clauses** (Core Invariants)
2.  **Authoritative State Matrix** (ALR)
3.  **Governance Lineage** (Merkle-anchored Receipts)
4.  **Witness Quorum Ratifications**
5.  **Auditor Verification Certificates**
6.  **Runtime Local State** (Ephemeral)

## 6. Adversarial Interpreter Model

Compliant ZTAN runtimes MUST assume an adversarial environment:
- **Evidence Over Assertion**: No runtime assertion is authoritative unless it is derived exclusively from replay-verifiable constitutional artifacts.
- **Replay Sovereignty**: Institutional legality SHALL be reconstructable by any independent auditor possessing the Genesis block and the historical transparency log.

## 7. Archival Integrity & Persistence

### 7.1 Archival Health Mandate
- **Cadence**: Archival health audits MUST be performed every 30 days or upon institutional resurrection.
- **Health Certificates**: A successful audit produces an `ArchivalHealthCertificate`, signed by the auditor, confirming lineage continuity and bit-rot absence.
- **Algorithm Transition**: During cryptographic migration, archives MUST be re-anchored with the new algorithm while preserving the historical signature validity.

## 8. Formal Theorem Layer

The ZTAN institution aims for **Theorem-Backed Governance**:
- **Invariant Proofs**: The institution uses formal methods (e.g., TLA+, model checking) to model safety bounds and analyze whether double finality and split-brain scenarios are mitigated within the defined BFT limits.
- **Machine-Checked Safety**: compliant runtimes SHOULD support the injection of formal proofs along with governance receipts to move toward **Proof-Carrying Transitions**.

## 9. Institutional Jurisprudence & Ambiguity

In the event of formal ambiguity or conflicting auditor conclusions, the following **Ambiguity Resolution Protocol** SHALL be invoked:

1.  **Mandatory Hibernation**: The institution MUST enter `HIBERNATING` state immediately upon detection of a verification discrepancy between heterogeneous auditors.
2.  **Resolution by Formal Proof**: The ambiguity SHALL ONLY be resolved by the submission of a formal, machine-checked proof (e.g., Isabelle/HOL or Coq) that demonstrates the unique valid interpretation of the lineage.
3.  **Resolution Authority**: Once a resolution proof is ratified by a constitutional majority (or defined quorum policy, including emergency recovery paths) of the Witness Federation, it is registered as an authoritative operational precedent for subsequent audits.

## 10. External Reality Anchoring [Tier 5: Research / Non-Normative]

To address theoretical "perfectly replayable lineage" scenarios (where a synthetic history could be executed without external context), the system suggests mechanisms for anchoring to external reality. These are non-normative research guidelines:

1.  **Reference Time Anchoring**: Every state checkpoint should include a signed attestation from independent, high-availability time sources (e.g., Roughtime, NTP-sec) to establish a target temporal order.
2.  **Entropy Infusion**: The Genesis block and subsequent epoch rollovers should incorporate external entropy from physical or public beacons (e.g., hardware entropy generators or NIST Randomness Beacon) to help ensure lineage uniqueness under test.

## 11. Institutional Death (Terminal Failure)

An institution is considered **Irrecoverably Extinct** if any of the following terminal conditions are met:

1.  **Genesis Entropy Collapse**: Loss of the ability to prove the unique entropy source of the Genesis block.
2.  **Lineage Fork Finality**: Detection of two conflicting, Merkle-valid lineages that have both been ratified by >2/3 of the Witness Federation (Byzantine collapse).
3.  **Algorithmic Obsolescence**: Failure to migrate to a new cryptographic standard before the active algorithm is considered fully broken by the Auditor Federation.

## 12. Semantic Preservation Criteria

To fulfill the **Semantic Preservation Mandate**, migrations MUST satisfy the following criteria:

1.  **Effect Preservation**: The transition must verify that the net effect of existing governance commitments (e.g., witness lists, thresholds) remains unchanged in the target system.
2.  **Jurisprudence Continuity**: Past actions must retain their legal force unless explicitly repealed.
3.  **Interpretation Parity**: The logic for determining "legality" in the new system is expected to remain equivalent under standard verification models to the old system's logic for all historical transitions.
