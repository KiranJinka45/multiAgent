# ZTAN Maturation Roadmap: Evidence Accumulation Phase

Following the successful completion of the Phase D Adversarial Validation Campaign, the ZTAN platform has transitioned from the **architectural design** phase to the **evidence accumulation** phase. 

This document outlines the 10 growth vectors required to transition ZTAN from a laboratory-bound research platform to a production-grade, exploit-resilient, and scientifically verified governance engine.

---

## 1. Physical Firecracker Execution & KVM Hardening
- **Current State:** The isolation boundary is managed by a `MockFirecrackerAdapter` simulating sandbox creation and termination.
- **Maturation Path:**
  - Replace the stubbed adapter with direct Firecracker binary invocations using the Firecracker API over Unix sockets.
  - Test real KVM boundary validation, cgroup resource pressure throttling (CPU share limits, memory OOM-killing), and seccomp filter restrictions.
  - Implement and verify Firecracker snapshot-and-restore timings to establish sub-10ms clean runtime restoration.

## 2. Ontology Surface Expansion
- **Current State:** The Side Effect Ontology contains 3 registered operations (`read-log`, `write-log`, `delete-db`).
- **Maturation Path:**
  - Expand the ontology model to cover the full standard library of execution operations (e.g., file reads/writes, child process spawning, socket bind/listen, DNS resolution, system call invocation).
  - Develop automated parser mappings to translate raw planner commands into multi-dimensional ontology effects prior to evaluation.

## 3. Semantic Replay Validation under Natural Drift
- **Current State:** Replay equivalence is validated under strict harness-deterministic conditions (entropy normalization).
- **Maturation Path:**
  - Introduce uncontrolled network latencies, database connection pool exhaustion, filesystem contention, and multi-threaded race conditions.
  - Define and evaluate a "drift tolerance coefficient" measuring how far async executions can drift from their forecasted dry-run paths before triggering quarantine actions.

## 4. Long-Duration Drift and Aging Campaigns
- **Current State:** Campaigns are short-lived, transient test runs.
- **Maturation Path:**
  - Execute long-duration soak runs (72+ hours) under high load.
  - Monitor memory leakage, database partition compaction latency, and ledger file descriptor drift.
  - Validate the durability and fencing lease renewal robustness of the OPA and Temporal workflow mock replacements.

## 5. Resource-Exhaustion Archaeology & Failure Recovery
- **Current State:** Resource constraint checking throws a synchronous error in the orchestrator.
- **Maturation Path:**
  - Force physical resource failures: disk-full conditions on the rootfs storage path, network interface dropouts, CPU starvation on the host, and kernel memory leaks.
  - Verify that the process sweeper and `finally` teardown blocks can successfully sweep orphaned sandboxes and preserve fail-closed invariants even when the host system experiences total degradation.

## 6. Multi-Node Causality Experiments
- **Current State:** Governance evaluations run locally inside a single process workspace.
- **Maturation Path:**
  - Distribute governance decisions across multiple consensus verification nodes.
  - Implement a distributed ledger consensus algorithm (e.g., Raft, PBFT) to prevent single-point-of-failure compromise of the transparency ledger.
  - Test partition tolerance (split-brain scenarios) to ensure that nodes fail-closed rather than allowing split executions.

## 7. Telemetry Provenance and Witness Hardening
- **Current State:** Telemetry validation is checked via logical validation rules in the test runner.
- **Maturation Path:**
  - Integrate hardware-rooted cryptographic anchors (e.g., TPM 2.0 or secure enclaves like SGX/TDX) to secure telemetry hashes.
  - Develop an independent "Witness Node" framework that signs execution checkpoints using threshold cryptography, rendering the ledger fully tamper-evident.

## 8. Failure Archive Corpus Growth
- **Current State:** Bounded adversarial payloads are manually crafted within the test files.
- **Maturation Path:**
  - Establish a standardized format for logging failed proposals, drift anomalies, and sandbox limit violations.
  - Store these cases in a central, immutable "ZTAN Pathology Archive" (`.ztan-transparency/pathology/`) to build a comprehensive regression baseline for future planner and model updates.

## 9. Independent Reproducibility & Harnessing
- **Current State:** Testing is coupled to local workspace files and execution tools.
- **Maturation Path:**
  - Package ZTAN governance components into standardized Docker/OCI containers.
  - Provide a clean, single-command validation harness (`pnpm run test:verify:external`) that allows external operators to reproduce the D1–D6 adversarial integration results on clean, isolated host systems.

## 10. Statistical Reliability Baselining & SLAs
- **Current State:** Success is reported as binary Pass/Fail verdicts.
- **Maturation Path:**
  - Gather longitudinal execution logs to establish statistical metrics (P99 latency bounds, overhead percentages, mean time to detect anomalies).
  - Calculate empirical SLA safety boundaries, determining the mathematical threshold where governance overhead is optimized against sandbox escape risks.
