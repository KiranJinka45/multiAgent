# 🛠️ ZTAN Phase 11A — Mechanical Trust Enforcement Manifest
**The Concrete Implementation Blueprint for Bounded Runtime Hardening**

> [!IMPORTANT]
> **Active Implementation Freeze on Governance**
> This manifest outlines the exact execution order for **Phase 11A — Mechanical Trust Enforcement**. 
> ZTAN’s architectural and strategic definition is permanently frozen at **92% Design Maturity**. No further governance, charters, philosophical safeguards, or architectural abstractions may be added. 
> The central mission of Phase 11A is **implementation convergence**: moving ZTAN from a highly mature design specification into an operationally hardened, mechanically enforced coordination runtime (**Targeting 80%+ Runtime & Staging Survivability**).

---

## 📅 The Execution Hierarchy: Tiered Build Order

```
  [ TIER P0: Root Sovereignty ] ──► [ TIER P1: Distributed Enforcement ] ──► [ TIER P2: Empirical Survivability ] ──► [ TIER P3: Operator Reality ]
  * Postgres Native Fencing         * etcd Lease Integration                  * tc/iptables Latency Chaos             * Compact Observatory GUI
  * Startup Attestation             * OPA/Rego Sidecars                       * Staging 72-Hour Soak                  * Quarantine Release CLI
  * Dependency SBOM / Snyk          * mTLS CA & Rotation                      * 1000-Writer Concurrency               * Diff Replay Viewers
```

---

## 🏛️ Tier P0 — Root Sovereignty Enforcement (Build Immediately)

These components target the primary database authority boundary. Without Tier P0, all upper-layer consensus (etcd) and policy gating (OPA) are strictly advisory.

### 1. PostgreSQL Native Write Fencing
*   **Objective:** Prevent direct database bypass (by rogue DBAs or compromised keys) and enforce append-only constraints at the storage layer.
*   **Build Deliverables:**
    *   **Native DB Triggers:** PostgreSQL PL/pgSQL triggers on the outbox serialization sequence, enforcing that records can only be appended, never updated or deleted.
    *   **Row-Level Locks (`SELECT FOR UPDATE`):** Core application outbox queries modified to enforce strict database row-level locking on active transitions.
    *   **Fencing Epoch Checks:** DB-level checks validating that incoming writes match the active lease-holder ID and sequential epoch.
    *   **Actor Signature Verification:** Enforcing that no outbox write is committed unless it carries a valid NIST P-256 signature matching registered keys in the DBA metadata schemas.

### 2. Startup Attestation & Shadow Exception Detection
*   **Objective:** Block unledgered configuration modifications and "shadow exceptions" on boot.
*   **Build Deliverables:**
    *   **Configuration Checksum Verification:** Cryptographically hash all startup configs (`.env`, local JSON files) and match them against signed ledger manifests.
    *   **Environment Variable Hash Audits:** Scan system process memory on boot; reject startup if unledgered, undocumented, or unchecksummed environment variables are present.
    *   **Ledger Bypass quarantine:** Block the runtime transition to the `ACTIVE` state, quarantine-locking the node if configuration integrity checks fail.

### 3. Supply-Chain Hardening
*   **Objective:** Secure the massive Node.js/pnpm transit dependency tree against malicious third-party injections.
*   **Build Deliverables:**
    *   **Dependency Pinning:** Lock direct and indirect npm packages to exact cryptographic hashes.
    *   **Snyk SBOM in CI:** Enforce automated Software Bill of Materials (SBOM) generation and Snyk vulnerability auditing on every pull request.
    *   **Container Provenance Verification:** Validate base Docker images using cryptographic cosign checks inside staging containers.

---

## 🌐 Tier P1 — Distributed Coordination Enforcement

Build only *after* Tier P0 is fully verified. We reject implementing leases or caching layers without active database-level write fencing.

### 4. etcd Lease Integration & GC Latency Isolation
*   **Objective:** Implement active leader leasing without falling victim to V8 engine scheduling delays.
*   **Build Deliverables:**
    *   **GC Latency Telemetry:** Measure V8 garbage collection (GC) latency sweeps on loopbacks.
    *   **etcd Heartbeat Tuning:** Dynamically size the etcd lease window based on measured GC pause latency to prevent accidental master node step-downs.
    *   **Monotonic Epoch Fencing:** Increment lease epoch numbers on etcd master failovers, writing epoch keys directly into PostgreSQL write-locks.

### 5. OPA/Rego Sidecar Gating
*   **Objective:** Convert simulated TypeScript policies into immutable, compiled out-of-band constraints.
*   **Build Deliverables:**
    *   **Local OPA Sidecar:** Package and deploy a zero-dependency, local Open Policy Agent sidecar container.
    *   **Compiled Rego Rules:** Port all typescript safety filters into statically compiled `.rego` files.
    *   **Fail-Closed Policy Engine:** Gating that defaults to hard containment if the OPA cache is unreachable or checksum validation fails.

### 6. Mutual TLS (mTLS) Everywhere
*   **Objective:** Cryptographically secure all internal network transport.
*   **Build Deliverables:**
    *   **Staging CA:** Configure a local Certificate Authority to generate and rotate node keys.
    *   **Transport mTLS:** Enforce mandatory mutual TLS between the Single-Writer coordinator, PostgreSQL, and etcd.

---

## 🌪️ Tier P2 — Empirical Survivability

Transition ZTAN’s testing from simulated software mocks to destructive physical infrastructure chaos.

### 7. Physical Chaos Infrastructure
*   **Objective:** Execute realistic hardware and network pathology stress.
*   **Build Deliverables:**
    *   **tc/iptables Packet Loss Injectors:** Build stateless CLI tools that drop up to 30% of packets in Docker networks.
    *   **WAL Corruption Sandboxing:** A script that purposefully corrupts specific outbox records in raw database storage blocks to test recovery behavior.
    *   **Disk Exhaustion & Connection Floods:** Saturation scripts that trigger PostgreSQL connection limits and table deadlocks.

### 8. Physical Staged Soak
*   **Objective:** Measure long-horizon memory, CPU, and database stability under load.
*   **Build Deliverables:**
    *   **72-Hour Staging Soak:** Run a non-mocked, continuous transactional workload against a multi-replica PostgreSQL cluster.
    *   **Memory Leak Tracking:** Automated V8 heap dump analysis triggers on memory usage exceeding 75%.

### 9. Concurrency & Replay Verification
*   **Objective:** Prove serialization correctness under massive parallel load.
*   **Build Deliverables:**
    *   **Multi-Writer Stressor:** Inject 1,000 parallel transactional writers, verifying that row-locking prevents drift.
    *   **Replay Parity Audit:** Automated comparisons verifying historical outbox chains match active compaction chains.

---

## 📺 Tier P3 — Operator Reality

Build minimal, low-cognitive-load visual tools to prevent operator panic, command-path depth errors, and bypass behavior.

### 10. Bounded Operational Observatory Console
*   **Objective:** Keep operator recovery actions safe, simple, and rapid under outages.
*   **Build Deliverables:**
    *   **Compact State DAG Interface:** A zero-dependency local GUI displaying the active state transition (`READ_ONLY`, `REBUILDING`, `ACTIVE`, `QUARANTINED`).
    *   **Quarantine Release Portal:** A high-visibility, manual multi-signature signature input dashboard.
    *   **WAL Replay Diff Viewer:** Highlights sequence anomalies, showing operators the exact drift source.
    *   **Incident Path Guide:** Embeds simple recovery scripts directly in the interface, keeping incident navigation extremely shallow.

---

## 🚫 Prohibited Operations & Non-Goals

The following vectors remain strictly prohibited from ZTAN’s execution paths:
*   ❌ **Multi-Master & Distributed Writes:** Write coordination must remain strictly single-writer.
*   ❌ **Dynamic Plugin Frameworks:** All policy certifiers must remain compiled and static.
*   ❌ **AI-Directed Autonomous Mutators:** Probabilistic systems remain advisory (Tier A).
*   ❌ **Persistent Chaos Platforms:** All pathology tools remain ephemeral and developer-scoped.
*   ❌ **Browser-accessible CLI shells:** Blocks shell access inside the GUI Observatory.

---

## 📊 Objective Maturity Targets

| Metric | Staging Target (Phase 11A End) |
| :--- | :---: |
| **Runtime Enforcement Maturity** | **85%** (from 35%) |
| **Empirical Survivability Maturity** | **75%** (from 12%) |
| **Real Production Pilot Readiness** | **80%** (from 30%) |
