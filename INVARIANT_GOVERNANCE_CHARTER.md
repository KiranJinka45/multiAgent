# Nexus ZTAN Invariant Governance Charter

> [!IMPORTANT]
> **Active Architecture Freeze**
> This charter defines the strict operational boundaries and governance-enforced architectural constraints of the Nexus ZTAN coordination platform. It is designed to be small, measurable, automated, and boring—preventing the reintroduction of speculative complexity.

---

## 🏛️ 1. Scope & Architectural Identity

ZTAN is a **PostgreSQL-authoritative replay-and-recovery coordination platform**. It is NOT a regional decentralized consensus engine, global sovereignty layer, or Byzantine network. 
All operational guarantees—including write sequencing, epoch fencing, and partition states—are authoritatively governed by PostgreSQL acting as the single transactional consistency root.

* **Architecture Freeze Clarity**: The active **Architecture Freeze** applies strictly to **business-domain coordination primitives** (such as state-machine state space layout, consensus mechanics, transaction schemas, outbox ledger structures, and fencing generation policies). It does *not* restrict the development, integration, or expansion of **out-of-process reliability validation infrastructure** (such as telemetry agents, reproducibility analyzers, diagnostic dashboard servers, or destructive pathology suites), which are essential tools for our empirical verification program.
* **Stateless Horizontal Scaling Boundary:** Stateless and advisory layers (AI agent orchestration, inference, policy evaluation, telemetry, read replicas) may scale horizontally immediately. The authoritative transactional coordination core, lease ownership, and write path must remain strictly single-writer to eliminate split-brain risk and replay ambiguity.
* **Separation of Advisory and Execution Invariant:**
  > *LLMs may recommend actions. Only deterministic systems may authorize irreversible execution.*
  This single boundary is an immutable, frozen architectural gatekeeper across the platform. No probabilistic reasoning engine or stochastic agent loop shall ever possess direct mutation authorization or final execution rights.

---

## 📏 2. Measurable State-Machine Bounding

To prevent recursive complexity growth and state machine drift, the system's state space is strictly capped and frozen:

* **Canonical States:** Exactly 4 states are permitted. No transient, intermediate, or regional states may be added:
  1. `READ_ONLY` — Safe, non-mutating state.
  2. `REBUILDING` — Stepwise reconstruction of local ledger from WAL.
  3. `ACTIVE` — Normal write transaction processing.
  4. `QUARANTINED` — Drift and sequence mismatch containment state.

* **Permitted Transitions:** Exactly 6 state transition pathways are valid:
  - `READ_ONLY` $\rightarrow$ `REBUILDING` (Initiates reconstruction from postgres storage)
  - `REBUILDING` $\rightarrow$ `ACTIVE` (Enters operational transaction processing)
  - `ACTIVE` $\rightarrow$ `QUARANTINED` (Triggered automatically on trace or lineage inconsistency detection)
  - `ACTIVE` $\rightarrow$ `READ_ONLY` (Graceful operator step-down or epoch rotation)
  - `QUARANTINED` $\rightarrow$ `READ_ONLY` (Validated operator multi-signature cryptographic quorum release)
  - `READ_ONLY` $\rightarrow$ `ACTIVE` (Direct validation entry allowed only under verified parity conditions)

* **Governance Locks:** Direct transition from `QUARANTINED` to `ACTIVE` is strictly blocked at the runtime logic layer.

---

## 🔐 3. Bounded Tenant & Cryptographic Isolation

To prevent under-specified or speculative claims about security, ZTAN's partition-isolated replay-verifiable coordination environment is strictly defined:

* **Tenant Isolation Boundary:** Enforced exclusively at the storage layer via PostgreSQL partition schemas using the composite primary key constraint `(partitionId, deduplicationId)`.
* **Verification Scope:** Local runtime verification of serial hash chains. There is no global, peer-to-peer, or decentralized ledger verification.
* **Cryptographic Verification:** Every outbox transaction must be signed using NIST P-256 keys. Verification matches the chronological chain hashes against the PostgreSQL transaction record.
* **Compaction Anchor Trust:** History below the compaction anchor is archived. Lineage parity is verified strictly for the active suffix chain above the current compaction anchor.

---

## 🤖 4. Automated CI Governance Enforcement

To prevent slow invariant erosion and ensure that future maintainers cannot introduce shortcuts:

* **State-Machine Diffs:** CI gates must inspect state transition modules. Any pull request attempting to add states, introduce custom transition bypasses, or weaken fencing guarantees must be automatically rejected.
* **Stewardship Verification:** The validation suite (` drill:stewardship`) must be executed on every pull request. A verdict of `FAILED` in any wave blocks merge.
* **TLA+ parity:** Planned TLA+ modeling to ensure transition logic modifications maintain parity with formal safety invariants.

---

## 📜 5. Operational Calibration

Uptime, failover latencies, WAL growth curves, and operator incident frequency are tracked as concrete telemetry metrics in SRE dashboards. Success is measured strictly by **low operational toil and predictable and observable failover behavior under validated failure classes.**

---

## 📋 6. Document Precedence & Truth Hierarchy

To prevent documentation sprawl and ensure SRE operators have a single clear authority during recovery events:
1. **Running Code:** The compiled TypeScript code is the final source of system truth (with planned formal safety checks via `invariants.tla`).
2. **This Charter (`INVARIANT_GOVERNANCE_CHARTER.md`):** Governs all architectural boundaries and permitted transitions.
3. **Operational Reports:** Performance ledgers (`STEWARDSHIP_ENGINEERING_REPORT.md`) provide empirical execution baselines.
4. **Auxiliary Planning Files:** Any file in `.planning/` serves as a temporal context record and has zero governing authority over active systems.
