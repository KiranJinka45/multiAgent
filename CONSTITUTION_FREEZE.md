# ZTAN Constitutional Freeze (Candidate)

## 1. Intent
This document formalizes the stabilization of the ZTAN core invariants and transition logic. The institution has reached a degree of maturity where uncontrolled architectural drift represents a systemic safety risk.

## 2. Frozen Invariants
The following core invariants are now considered **Sovereign Baseline** and MUST NOT be modified without 100% witness ratification and a formal TLA+ proof delta:

- **State Matrix Topology**: The enumerated edges in `formal/STATE_MATRIX.json`.
- **Temporal Windows**: The minimum durations for recovery challenges and governance finality.
- **Evidence Supremacy**: The mandate that evidence-based forensics dominates runtime assertions.
- **External Anchoring**: The requirement for civilization-scale time and physical entropy.

## 3. The Freeze Window
This freeze enters force upon the completion of Phase Ω and the successful certification of the Rust Auditor implementation.

## 4. The Existential Rule
Nexus ZTAN is protected from entropy by the following mandate:
**NO NEW CORE ABSTRACTIONS WITHOUT REPEATED REAL-WORLD EVIDENCE THAT THE EXISTING SYSTEM CANNOT SOLVE THE PROBLEM.**

This rule ensures that the system evolves only under the pressure of operational reality, not conceptual speculation.

## 5. Future Modifications
Any proposed change to "Frozen" logic must include:
1.  **Updated TLA+ Spec**: Proving that the change does not violate existing safety invariants.
2.  **Cross-Implementation Patch**: Simultaneous PRs for both TypeScript and Rust auditors.
3.  **Migration Proof**: Demonstration of interpretation parity for historical archives.

> **Status**: EFFECTIVE 🛡️
> **Effective Date**: 2026-05-10
