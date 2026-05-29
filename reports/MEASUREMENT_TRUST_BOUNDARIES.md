# ZTAN Measurement Trust Boundaries

## 1. Introduction

As a **high-assurance single-host orchestration and governance research platform**, ZTAN depends heavily on continuous runtime measurement to validate system state, verify operations, and audit operator actions. 

However, to prevent accidental self-deception and ensure rigorous engineering claims, we must establish a formal boundary between:
1. **Sovereign Transactional Integrity**: Mathematical, deterministic, and immutable guarantees.
2. **Observational & Sampled Telemetry**: Empirical, lossy, and eventually consistent data streams.

Operators and research evaluators must understand these boundaries so they do not mistake observational telemetry for transactional truth.

---

## 2. Telemetry Authority & Consistency Classifications

The ZTAN runtime classifies all generated telemetry and state evidence into three distinct trust layers:

| Layer / Classification | Primary Data Types | authoritative Boundary | Consistency Model | Loss Tolerance |
|---|---|---|---|---|
| **Authoritative Ledger** | Sequence IDs, Cryptographic block hashes, PrevHash linkages, Operator ECDSA signatures, WAL logs. | PostgreSQL Fenced Transaction boundary & Local FSCryp Append. | Immediate & Linearizable (Single-Host constraint). | **Zero Tolerance**. Any loss or mismatch is a campaign FAIL. |
| **Eventually Consistent Audit** | `AuditLog` entries, correlation traces, Outbox healing queue entries. | Quorum-stabilized outbox workers & best-effort fallback writes. | Eventually Consistent (Reconciliation delay up to 30s+). | **No permanent loss allowed**, but transient delivery lag is expected. |
| **Sampled Exploratory Telemetry** | Event Loop Utilization (ELU) fractions, memory utilization (RSS/heap), OS active handle lists. | Node.js asynchronous parent-child IPC channel (`process.send`). | Best-effort / Lossy. | **High Tolerance**. Telemetry packet drops are expected under resource starvation. |

---

## 3. Detailed Trust Layer Analysis

### 3.1. Sovereign Transactional Layer
This is the core ZTAN trust boundary. A state change is only considered "transactional truth" when it is successfully appended to the local ledger file and committed to the PostgreSQL consensus database under a fenced distributed lease.

* **Integrity Guarantee**: Each block is cryptographically linked to its predecessor via SHA-256 (`prevHash`).
* **Operator Verification**: The database enforces that every block mutation carries a valid cryptographic signature matching the operator's registered public key in `ZtanRegisteredKey`.
* **Fencing**: Write transactions execute only if the process holds the active lock file and database lease generation matching the local authority.
* **Lineage Preservation**: The Write-Ahead Log (WAL) tracks pending writes to resolve partial transaction completions upon restart.

### 3.2. Eventually Consistent Audit Layer
The `AuditLog` records exist to trace client requests and correlate client-side responses with server-side writes. 

* **The Best-Effort Outbox Fallback**: When the database is offline or degraded, the system continues to accept writes locally and writes them to an outbox file. At this point, the transaction is logged locally, but no `AuditLog` row exists in the database.
* **Observational vs. Transactional**: Because audit creation is deferred until outbox quorum stabilization and reconciliation, **the presence of a request in the client history does not guarantee database transaction atomicity**. 
* **post-Facto Reconstruction**: Under partition healing, the outbox worker reconstructs missing `AuditLog` rows post-facto. Therefore, the audit timeline is eventually consistent and observationally reconstructed.

### 3.3. Asynchronous Sampled Telemetry Layer
Exploratory telemetry collects heap usage, RSS delta, V8 heap space fragmentation, GC pause durations, and Event Loop Utilization (ELU).

* **IPC Transport Hazards**: Telemetry packets are sent via process IPC channels (`process.send()`). Because this mechanism yields to Node.js's event loop, severe CPU saturation, garbage collection storms, or thread pool starvation can delay, duplicate, or drop telemetry packets.
* **JIT & Bootstrap Noise**: In short runs, initial V8 engine compilation and heap allocation create transient memory spikes (e.g. 7000+ MB/hour growth rates) which are purely noise rather than structural leaks.
* **Non-Blocking Guarantee**: Telemetry collection runs asynchronously and is explicitly designed to fail-silent rather than block or crash the primary service thread.

---

## 4. Operational Guidelines

1. **Do Not Audit via Telemetry**: Telemetry metrics are exploratory. No governance decisions or security fencing actions may be triggered based on sampled telemetry (such as ELU levels or heap sizes).
2. **Authoritative Verdicts**: Only Ledger blocks and WAL logs are authoritative for verdict generation. The platform state is only certified as `PASS_PRISTINE` when the transaction chain is unbroken and 100% verified.
3. **Audit Correlation**: Operators must treat `AuditLog` timestamps as approximate, using transaction block heights rather than wall-clock times to establish causal ordering.
