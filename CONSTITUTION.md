# ZTAN Institutional Constitution (v1.12)

> **Status**: SOVEREIGN_STABLE
> **Version**: 1.12
> **Last Ratified**: 2026-05-09

This document formalizes the cryptographic and constitutional invariants of the ZTAN institution. These rules are enforced programmatically by the Witness Federation and the Institutional Auditor.

## 1. Sovereignty Hierarchy

Authority within ZTAN is divided into three distinct domains: **Governance Council**, **Witness Federation**, and **Auditor Federation**.

## 2. Institutional States

The institution transitions through a formal state machine: **QUIESCENT**, **PROPOSING**, **RECOVERING**, **LOCKED**, **HIBERNATING**.

## 3. Byzantine Finality & Persistence

### 3.1 Proposal Constraint
To prevent split-brain quorums, only **one governance proposal** can be active per sequence number.

### 3.2 Hardened Persistence
Every Witness Federation member MUST implement **Atomic Persistence**. Any governance action applied to the local state MUST be committed to non-volatile storage before the witness acknowledges the action.

### 3.3 State Checkpointing
The Federation SHALL periodically issue a `STATE_CHECKPOINT` action, anchoring a full serialized snapshot of the institutional state into the transparency log.

## 4. Federated Sovereignty (Multi-Log Finality)

### 4.1 Cross-Institutional Anchoring
An institution MAY anchor its **Governance Root** into the transparency log of another sovereign ZTAN institution.

### 4.2 Guardian Institutions
An institution MAY pre-approve a "Guardian Institution" to provide emergency recovery services.

### 4.3 Acyclic Sovereignty Constraints
To prevent circular legitimacy dependencies, an institution SHALL NOT register a Guardian Institution that is part of its own federation or that creates a recursive recovery loop. The **Sovereignty Graph** must remain acyclic to ensure independent institutional recovery.

## 5. Evolutionary Sovereignty

### 5.1 Constitutional Migration
The institutional rules MAY be updated via a `CONSTITUTIONAL_MIGRATE` action. If any "Core Clause" is modified, the migration requires **100% witness ratification**.

### 5.2 Protocol Rollover
The underlying protocol logic MAY be upgraded via a `PROTOCOL_UPGRADE` action. This rollover initiates a new governance epoch while maintaining the historical lineage.

## 6. Cryptographic Agility & PQC Readiness

The institution MUST NOT depend on a single cryptographic algorithm for its long-term survival.

### 6.1 Signature Agility
The Witness Federation must support a registry of multiple signature algorithms (e.g., Ed25519, RSA, P256).

### 6.2 Quantum Migration
The council is authorized to initiate an emergency "Quantum Roll-over" if current algorithms are deemed vulnerable to asymmetric cryptographic attacks.

### 6.3 Migration Finality
A cryptographic migration requires 100% witness ratification to prevent "Algorithmic Capture" or forking.

## 7. Heterogeneous Audit Mandate

To mitigate the risk of implementation-specific bugs (monoculture failure), the ZTAN protocol MUST be verified by heterogeneous auditor implementations.

### 7.1 Dual Implementation
At least two independent, clean-room implementations of the Auditor logic (e.g., in TypeScript and Rust) must confirm the validity of the institutional lineage.

### 7.2 Discrepancy Resolution
In the event of an implementation discrepancy, the "Black Box" state is considered UNVERIFIED, and the institution must enter HIBERNATION until a formal proof of correctness resolves the conflict.

## 8. Sovereign Finality

### 8.1 Institutional Hibernation
An institution MAY transition into **HIBERNATING** state. During hibernation, no governance proposals are accepted, but the Witness Federation continues to maintain the integrity of the historical log and the continuity proofs.

### 8.2 Sovereign Archival
A "Stable Sovereign Protocol" designation indicates that the ZTAN institution has achieved full forensic maturity. Such an institution MAY be "Archived" into cold storage, where its entire historical lineage is preserved as a cryptographically sealed memory, capable of resurrection at any time.

## 9. Formal Safety Standards

### 9.1 Formal Model Checking
The institutional state machine MUST be exportable as a formal **State Transition Matrix**. This matrix enables mathematical verification of state reachability and safety properties using tools like TLA+.

## 10. Constitutional Core Clauses

### 10.1 Immutable Invariants
Certain constitutional parameters are defined as **Core Clauses**. These clauses represent the fundamental safety properties of the institution (e.g., `challengeWindowMs`, `requireAuditorRatification`) and require **100% ratification** by all active members to modify.

## 11. Institutional Handover

### 11.1 Sovereign Succession
The ZTAN institution supports **Institutional Handover**, allowing for the full replacement of the Witness Federation while preserving the cryptographic lineage and epoch history.

## 12. Institutional Certification

### 12.1 Compliance Certification
A mature ZTAN institution SHALL undergo automated **Forensic Compliance Certification**. This process verifies the entire historical lineage, BFT safety invariants, and acyclic sovereignty graph.

## 13. Arbiter Accountability (Slashing)

### 13.1 Slashing
Malicious behavior results in immediate **AUDITOR_SLASH** or **WITNESS_SLASH** and quarantine of the arbiter.

## 14. Technical Enforcement

### 14.1 Authoritative Safety Specification
The technical implementation of the ZTAN runtime MUST adhere to the **Institutional Safety Specification** ([SAFETY_SPEC.md](file:///c:/multiagentic_project/multiAgent-main/docs/SAFETY_SPEC.md)). 

### 14.2 Supremacy Clause
In the event of a conflict between the high-level constitutional narrative and the formal Safety Specification, the **formal specification SHALL prevail** as the machine-enforceable definition of institutional truth.

### 14.3 Claims Drift Prevention & Authoritative Ledger
To prevent future claims drift and ensure that all security, compliance, and architectural assertions are backed by machine-enforceable evidence, the repository enforces a strict ledger constraint:

No claim may be added to:
- `SECURITY.md`
- `CONSTITUTION.md`
- Website content
- Investor decks
- Sales collateral

unless a corresponding entry exists in [CLAIMS_VERIFICATION.md](file:///c:/multiagentic_project/multiAgent-main/CLAIMS_VERIFICATION.md).


## 15. External Reality Anchoring

### 15.1 Civilization-Scale Time
To ensure temporal legitimacy, the institution MUST anchor its state checkpoints to multiple, independent civilization-scale time sources (e.g., Roughtime).

### 15.2 Non-Deterministic Entropy
Institutional Genesis and subsequent epoch rollovers MUST incorporate external physical entropy to ensure uniqueness and prevent replay of "false universes."

## 16. Institutional Death (Terminal Finality)

### 16.1 Irrecoverable Failure
The institution SHALL be considered **Irrecoverably Extinct** upon the detection of a terminal BFT safety collapse or the total loss of the ability to prove the unique entropy source of the Genesis block.
