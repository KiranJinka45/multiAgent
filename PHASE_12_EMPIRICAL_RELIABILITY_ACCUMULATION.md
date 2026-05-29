# 🛠️ ZTAN Phase 12 — Empirical Reliability Accumulation & Operational Archaeology
**The Strategic Charter and Roadmap for Constrained Runtime Experimentation**

> [!IMPORTANT]
> **Active Implementation Freeze on Architecture & Orchestration Features**
> ZTAN’s design, governance, and structural abstractions are **100% frozen**. 
> The central mission of Phase 12 is **Empirical Reliability Accumulation**: transitioning ZTAN from a mechanically enforced laboratory coordination runtime into a long-horizon, evidence-tested control plane. 
> We explicitly reject adding new features, dynamic capabilities, horizontal scaling, or browser telemetry to focus on discovering where the system breaks under real-world operational friction over elapsed time.

---

## 🏛️ The Strategic Objective

The goal of Phase 12 is **NOT** to prove the system is production-ready.

The goal is:
> **Discover exactly where the system breaks under real operational friction.**

Progress is no longer primarily intellectual or architectural; it is strictly **observational** and **empirical**.

---

## 📅 The Execution Hierarchy: Tiered Soak & Stress Strata

```
  [ TIER E1: Long-Horizon Soak ] ──► [ TIER E2: Pathology Drills ] ──► [ TIER E3: Failure Archaeology ] ──► [ TIER E4: Human Operators ] ──► [ TIER E5: Bounded Pilots ]
  * 7-day Continuous Workloads       * tc/netem Packet Shaping           * Replay Timeline Reconstruction      * Blind Recovery Exercises         * Low-blast-radius Tenants
  * Memory Growth Telemetry          * iptables Partition Stress         * Failure Snapshot Bundling           * Operator Hesitation Tracking     * Bounded Workloads
  * Snapshot Parity Replay           * cgroup Resource Limits            * Invariant Violation Cataloging      * Command-Depth Audits             * Strict Manual Override Only
```

---

## 🏛️ Tier E1 — Long-Horizon Soak Infrastructure

*   **Objective:** Measure system drift, degradation, memory leak slopes, and transactional replay consistency over extended horizons.
*   **Deliverables:**
    *   **7-Day Continuous Soak:** A non-mocked, automated workload harness running continuous state transitions.
    *   **Replay Parity Snapshots:** Automated scans comparing WAL sequence states with ledger block histories every N minutes.
    *   **V8 Performance Telemetry:** Continuous tracking of heap memory growth, event-loop lag slopes, and GC pause distributions.
    *   **DB Lock Contention Archaeology:** Continuous recording of transactional database lock queues under parallel stress.

---

## 🏛️ Tier E2 — Real Infrastructure Pathology Drills

*   **Objective:** Expose the single-writer coordination to real, out-of-band network and OS kernel pathologies.
*   **Deliverables:**
    *   **tc/netem Packet Shaping:** Injecting packet loss, reordering, and jitter at the OS interface layer.
    *   **Asymmetric iptables Partitions:** Injecting half-open TCP partitions and stale etcd cluster watcher visibility drops.
    *   **Cgroup Resource Pressure:** Running under CPU throttling limits and strict cgroup OOM limits.
    *   **Forced IO Throttling & fsync Latency:** Inducing storage-subsystem delays to test PostgreSQL WAL flush races and step-down triggers.

---

## 🏛️ Tier E3 — Failure Archaeology & Replay Science

*   **Objective:** Construct an immutable operational archive of system state drift.
*   **Deliverables:**
    *   **Failure Snapshot Bundles:** Automatically bundling raw database WAL sequences, ledger hashes, and env variables upon node quarantine.
    *   **Timeline Reconstruction Tooling:** A utility allowing operators to trace precise chronological invariant violations leading to lockdown.
    *   **Quarantine-Cause Lineage Archives:** Database telemetry classifying the exact trigger of quarantines (Attestation, OPA, Epoch Fence).

---

## 🏛️ Tier E4 — Human Operator Validation

*   **Objective:** Validate cognitive operational survivability under extreme failure conditions and attestation-degradation states.
*   **Deliverables:**
    *   **Blind Recovery Exercises:** Standardized drills where operators must resolve quarantines without direct process-shell access.
    *   **Conflicting Signal Drills:** Injecting misleading telemetry (e.g. lease success on expired heartbeats) to test operator correctness.
    *   **Command-Depth Audits:** Enforcing and measuring that recovery scripts remain extremely shallow (maximum 2 commands depth).
    *   **TPM PCR Drift Recovery Drills:** Practical SRE simulations where a node is locked out due to legitimate host firmware updates. Operators must execute the offline hardware-key-backed multi-signature ceremony to securely update measurement baselines and re-admit the node.
    *   **TSA Outage & Caching Exercises:** Drills where external Trusted Time Authorities are partitioned, forcing the node into a "degraded integrity state" with a 60-minute outbox-caching buffer, verifying that operators can either restore connectivity or prepare for quarantine-locking before the window expires.


---

## 🏛️ Tier E5 — Controlled Pilot Exposure

*   **Objective:** Earn initial institutional trust under strict, low-blast-radius controls.
*   **Mandatory Rules:**
    *   **No Autonomous Remediation:** All self-healing mythology is strictly barred. Quarantine and step-down remain mandatory.
    *   **Human-Supervised Execution:** Replay and override are manually executed via multi-sig operator signatures.
    *   **Low-blast-radius tenants:** Strictly isolated, non-critical, fully replayable workloads.

---

## 🚫 Prohibited Operations & Non-Goals

The following abstractions remain permanently banned from ZTAN's execution paths:
*   ❌ **Multi-Region Writes & Horizontal Scaling:** Write coordination remains strictly single-writer.
*   ❌ **Dynamic Plugin/Agent Frameworks:** All policy certifiers remain compiled, static Rego structures.
*   ❌ **Persistent Observability Clusters:** Observatory remains local-only and bounded to prevent platformization drift.
*   ❌ **Autonomous AI remediations:** Self-healing code generation or state patching remains strictly forbidden.

---

## 📊 Objective Maturity Targets

The realistic target scores for the conclusion of the Phase 12 soak and archaeology epoch:

| Dimension | Baseline Staging | Phase 12 Expected Status |
| :--- | :---: | :---: |
| **Design Maturity** | **92–94%** | **95%** (Frozen) |
| **Runtime Maturity** | **60–65%** | **75–80%** (Hardened) |
| **Empirical Survivability** | **20–30%** | **50–60%** (Proven) |
| **Pilot Readiness** | **50–60%** | **70%** (Validated) |
| **Production Deployment Readiness** | **UNPROVEN** | **CONDITIONAL / DISCIPLINED** |

---

## 📊 The Single Critical Metric: Recovery Integrity

Throughput and latency remain advisory. ZTAN's survival relies on **Recovery Integrity**:
> **After real infrastructure pathology, can the system reconstruct absolute truth, quarantine uncertainty, and resume safely without hidden drift?**

Resisting the urge to invent features is our primary strategic discipline.
