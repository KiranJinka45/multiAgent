# ZTAN Entropy Accounting

## 1. Introduction

In high-assurance governance state machines, **replay equivalence** is a critical tool for debugging and verification. If a system experiences a failure, an operator must be able to restore a snapshot, rerun the same transactions, and arrive at a mathematically identical final state.

However, in a real-world asynchronous runtime environment, **naturally deterministic execution is impossible** due to several active sources of execution entropy. This document catalogs these entropy sources and details how ZTAN suppresses them to achieve reproducible replay campaigns.

---

## 2. Catalog of ZTAN Execution Entropy Sources

| Source | Category | Description | Impact on Replay Parity |
|---|---|---|---|
| **ECDSA Signatures** | Cryptographic | Standard Node.js `crypto.createSign('SHA256')` uses randomized EC signature generation (per NIST P-256 standard). | Signing the exact same payload twice produces different signature base64 strings, resulting in different block hashes. |
| **System Clock** | Temporal | Block creation queries the local system clock via `new Date().toISOString()` to set the transaction timestamp. | Under replay, the local system time has moved forward. The different timestamp alters the input to the hash calculation, causing cascading hash drift. |
| **Random UUIDs** | Cryptographic | Operations generate `crypto.randomUUID()` to represent unique tracing IDs (`requestUuid`, `auditUuid`, etc.). | Mismatched UUID tokens change the string content of block payloads, altering their resulting SHA-256 hashes. |
| **Async Task Scheduling** | Scheduling | Async tasks interleave based on database pool connection times, file-system lock file I/O speed, and event-loop lag. | Mismatched task scheduling can alter the order of concurrent writes, resulting in different sequence ID allocations for the same mutations. |

---

## 3. Controlled Entropy Suppression Methodology

To prove that the ZTAN lineage and outbox reconciliation code operates correctly without state drift, we employ **Controlled Entropy Suppression** during replay campaigns. This forces the system into a deterministic execution state for the duration of the test:

```
  ┌─────────────────────────────────────────────────────────────┐
  │                   Replay Campaign Harness                   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│Mock Signatures   │   │Mock System Clock │   │Deterministic UUID│
│(SHA-256 Mock)    │   │(Stack Trapped)   │   │(Sequence Counter)│
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

### 3.1. Deterministic Mock Signatures
We override `GovernanceLedger.signPayload` and the corresponding `verifySignature` methods during replay runs. Instead of signing using ECDSA on EC keys, the mock computes a SHA-256 hash of the payload appended with a static salt.
* **Why**: Ensures that signing the same transaction payload always produces the exact same signature string.

### 3.2. Stack-Trapped System Clock Override
Instead of globally freezing the JavaScript clock (which would break network protocols, database timeout drivers, and telemetry collection), we selectively override `Date.prototype.toISOString`. 
* **Mechanism**: When `toISOString` is called, we inspect the error stack trace. If the caller function is `appendEntry` or `createGenesisEntry`, we return a pre-recorded deterministic timestamp. Otherwise, we delegate to the real system clock.
* **Why**: Allows the database driver and runtime to run normally, while freezing the clock strictly inside the block creation transaction envelope.

### 3.3. Deterministic UUID Templates
Rather than generating random bytes, the replay test harness utilizes counter-based valid v4-like UUIDs:
* Baseline requests use format: `11111111-1111-4111-8111-0000000000XX`
* Workload requests use format: `aaaaaaaa-aaaa-4aaa-8aaa-0000000000XX`
* **Why**: Guarantees identical payload strings for matching transaction indexes.

---

## 4. Key Epistemic Claims & Limits

> [!WARNING]
> **ZTAN is not naturally deterministic**. Under nominal production conditions, running the same workload twice will result in different block hashes, different timestamps, and different signatures. 
> 
> What ZTAN's Replay Equivalence Campaign proves is that **the platform is deterministic under controlled entropy normalization**. This confirms that the database outbox reconciliation logic and state transition rules introduce zero state drift of their own, isolating logic defects from ambient environmental noise.
