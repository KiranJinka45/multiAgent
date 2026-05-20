# Replicated Append-Only Durable Consensus Storage Specification (ZTAN v1.5.0-LTS Spec)

This document establishes the official systems-engineering design specification for **ZTAN v1.5.0-LTS**, focusing on resolving the platform's single-node persistence concentration risk by introducing a replicated, append-only, consensus-backed storage layer.

---

## 🎯 1. Strategic Objective: Resolving Single-Node Authority Concentration

While ZTAN v1.4.0-LTS successfully implements native multi-process validators, logical causality (HLC), and Write-Ahead Log (WAL) recovery, the persistence authority is still fundamentally centralized in a single local JSON database and REST API state file. 

If the database storage layer is maliciously modified, suffers silent hardware corruption, or is deleted, the entire system's authority boundary collapses. To transition ZTAN from a highly sophisticated simulation to a **governance-grade operational trust substrate**, the next engineering frontier must eliminate this central concentration risk.

```mermaid
graph TD
    subgraph Current Architecture (ZTAN v1.4.0-LTS)
        A[Multi-Process Validators] -->|Consensus over TCP| B[Async Transport Bus]
        A -->|State Persistence| C[(Centralized JSON Filesystem Database)]
        style C fill:#f96,stroke:#333,stroke-width:2px
    end
    
    subgraph Next Architecture (ZTAN v1.5.0-LTS)
        D[Multi-Process Validators] -->|Consensus over TCP| E[Async Transport Bus]
        D -->|Append-Only Writes| F[PostgreSQL Primary WAL]
        F -->|Synchronous Streaming Replication| G[(Postgres Replica 1)]
        F -->|Synchronous Streaming Replication| H[(Postgres Replica 2)]
        I[Detached Verifier Daemon] -->|Read Replication Stream| F & G & H
        I -->|Attestation| J[Signed Cryptographic Receipts]
    end
```

---

## 🛡️ 2. Core Primitives of the Replicated Durability Layer

### 💾 A. PostgreSQL Write-Ahead Log (WAL) Integration
Instead of manual JSON stream flushes, the ledger state, Write-Ahead Logs, and snapshot records are backed by a robust transactional database engine:
* **WAL Durability**: All write operations are committed to the PostgreSQL WAL log and fsynced to persistent media before the transaction is acknowledged to the validator network.
* **Structured Chronology**: Leverages transaction sequence IDs (`txid`) and LSN (Log Sequence Numbers) to maintain physical causality, aligning perfectly with internal Hybrid Logical Clocks (HLC).

### 🔒 B. Immutable Append-Only Constraints (Database Level)
To prevent in-place database manipulation, state tampering, or retroactive deletions by a compromised database administrator (DBA) or OS user:
* **Trigger-Enforced Immutability**: All ledger, block, and transaction tables are bound to database-level triggers that explicitly block `UPDATE` and `DELETE` queries:
  ```sql
  CREATE OR REPLACE FUNCTION enforce_immutability()
  RETURNS TRIGGER AS $$
  BEGIN
      RAISE EXCEPTION 'ZTAN Safety Violation: Ledger records are strictly append-only. Modification is forbidden.';
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_ledger_no_mutation
  BEFORE UPDATE OR DELETE ON ztan_governance_ledger
  FOR EACH ROW EXECUTE FUNCTION enforce_immutability();
  ```
* **Hash-Chaining Constraints**: A Postgres database constraint verifies that the `prev_entry_hash` column of an inserted row matches the calculated SHA-256 hash of the immediately preceding sequence ID, locking hash continuity at the database layer.

### 🕵️‍♂️ C. Detached Verification Daemon & Signed Receipts
To decouple verification from execution, an independent, lightweight **Verification Daemon** runs as an isolated OS process:
* **Streaming Audit**: The daemon continuously reads the Postgres logical replication stream, recalculating the SHA-256 hash chain and verifying the NIST P-256 asymmetric signatures of all incoming blocks.
* **Signed Receipts**: Upon validating an epoch transition or a transaction sequence block, the daemon generates a **Signed Cryptographic Receipt** using its own isolated keypair. This receipt is broadcasted to the validator network, providing independent, out-of-band attestation of ledger integrity.

### 🌐 D. Consensus-Backed Durability (Synchronous Replication Quorum)
To resolve single-point-of-failure storage concentration, ZTAN deploys a highly available, replicated database cluster:
* **Synchronous Streaming Replication**: PostgreSQL is configured for synchronous replication with at least three database nodes across distinct network zones.
* **Quorum Acknowledgment**: A transaction is only declared complete and final when it is written to the WAL log of the primary node and successfully replicated to at least one synchronous standby replica (`synchronous_commit = 'on'`, `num_sync = 1` or `2`). This guarantees that power failure or disk collapse of the primary node does not result in timeline amnesia or state divergence.

---

## 📖 3. Hardened Technical Vocabulary & Safety Disclosures

To maintain absolute technical rigor and prevent conceptual inflation, the technical documentation for ZTAN v1.5.0-LTS adopts the following precise definitions:

### ⚠️ A. Reframing "HSM Hardening" to "HSM-Inspired Software Custody"
* **Specification Limit**: Because cryptographic keys (`operator.key`) are filesystem-resident, process-accessible, and software-loaded, they are subject to operating system and memory access vectors. 
* **Definition**: The system enforces **HSM-inspired software custody and ceremony discipline** (e.g. process isolation, key access auditing, strict ceremony friction) rather than hardware-isolated cryptographic protection (true hardware enclaves/HSM).

### 📉 B. Reframing "Completely Crash-Safe" to "Bounded Recovery under Tested Storage Corruption"
* **Specification Limit**: Absolute crash-safety is impossible due to hardware-level variations (journaling differences, SSD write-cache lies, power-loss write reordering, rename atomicity edge cases, and partial metadata flushes).
* **Definition**: The ZTAN platform offers **bounded recovery under tested storage corruption scenarios** (such as torn-writes, tail corruptions, and abrupt process terminations). It does not guarantee absolute safety under untyped, malicious physical storage faults.

---

## 📅 4. Implementation Roadmap (v1.5.0-LTS)

To prevent conceptual drift and maintain architectural discipline, ZTAN v1.5.0-LTS strictly prioritizes durability over feature expansion:

| Phase | Milestone | Primary Deliverable | Focus Area |
| :--- | :--- | :--- | :--- |
| **5.1** | PostgreSQL WAL Setup | Relocate local JSON persistence to transactional Postgres tables. | Durability |
| **5.2** | Immutability Triggers | Deploy SQL rules, triggers, and column-level verification firewalls. | Integrity |
| **5.3** | Quorum Replication | Configure multi-node synchronous replication with quorum acknowledgment. | Decentralization |
| **5.4** | Detached Verifier | Implement the independent verification daemon and signed receipt broadcasting. | Attestation |
| **5.5** | Durability Chaos Fuzz | Stress test database power loss, failover replication, and LSN rollback recovery. | Bounded Recovery |
