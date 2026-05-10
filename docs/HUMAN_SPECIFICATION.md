# ZTAN Canonical Human Specification (v1.0)

This document serves as the high-level, implementation-agnostic specification of the ZTAN institutional ontology. It is designed to ensure institutional readability across decades and ecosystem shifts.

## 1. Institutional Ontology
ZTAN is a **Formally Bounded Constitutional Runtime**. Its existence is defined by a sequence of Merkle-anchored, signed governance receipts that trace a path through a finite state topology.

### 1.1 The State Machine
The institution exists in one of six primary states:
1.  **QUIESCENT**: Normal operational mode.
2.  **PROPOSING**: Active governance debate.
3.  **RECOVERING**: Emergency restoration window.
4.  **LOCKED**: Post-failure safety state.
5.  **HIBERNATING**: Cold archival storage.
6.  **EMERGENCY_RECOVERY**: Bootstrap/Meta-state.

## 2. Legality Semantics
An institutional transition is **Legal** if and only if it satisfies four simultaneous criteria:
1.  **Topological Legality**: The transition edge exists in the Authoritative State Matrix.
2.  **Cryptographic Legality**: The receipt carries a valid quorum of signatures from the active council.
3.  **Temporal Legality**: All challenge windows and rate-limits have been respected.
4.  **Lineage Legality**: The receipt is Merkle-anchored to the preceding institutional state.

## 3. The Sovereignty Anchors
Legitimacy is anchored to external physical reality:
- **Civilization Time**: All checkpoints MUST be synchronized with civilization-scale time sources (e.g., Roughtime).
- **Physical Entropy**: Genesis and Epoch boundaries incorporate external physical randomness to ensure lineage uniqueness.

## 4. Institutional Finality & Death
The institution possesses **Constitutional Mortality**. If the ability to prove lineage continuity or genesis uniqueness is lost, the institution is considered **Irrecoverably Extinct**.

## 5. Archival Restoration
The entire institutional truth is reconstructable from the **Governance Log**. Any implementation of the ZTAN interpreter that consumes the same log MUST arrive at the same institutional reality.

## 6. Archival Civilization Hardening
To ensure institutional survivability across centuries, custodians must assume the total obsolescence of the current technology stack.

- **Minimal Survival Package**: A subset of the archive containing the human-readable Constitution, State Matrix, Rosetta Stone Corpus, and interpreter pseudocode.
- **Ecological Independence**: Legitimacy MUST be reconstructable even if digital repositories (GitHub/npm) and execution runtimes (Node.js/v8) no longer exist.
- **Cryptographic Succession**: Rules for migrating institutional signatures and hashes before active standards (e.g., SHA-2, Ed25519) are compromised or retired.

> **Status**: AUTHORITATIVE BASELINE
> **Effective Date**: 2026-05-09
