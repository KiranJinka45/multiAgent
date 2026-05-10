# ZTAN Determinism Boundary Specification

> Version: 1.0.0 | Status: FROZEN | Effective: 2026-05-08

This document formally defines the replay guarantees, environmental assumptions,
and divergence classifications for the ZTAN constrained orchestration runtime.

---

## 1. Replay Guarantees

### What Is Guaranteed

- **Trace ordering**: Events within a single deployment trace maintain insertion order.
- **Trace persistence**: Every `recordEvent()` call produces an immediate atomic write to disk (write-to-temp and rename). Events are not buffered.
- **Trace integrity**: Every trace file includes a SHA-256 checksum of the event payload. Corruption is detected at read time.
- **Environment fingerprint**: Each trace records a SHA-256 hash of `platform-arch-nodeVersion-NODE_ENV`. Replay verification rejects environment mismatches.
- **Schema stability**: The `IMissionEvent` interface and `FailureClass` enum are frozen for the v1.x release series. No fields will be added, removed, or retyped.
- **Idempotent replay verification**: `verifyForReplay()` returns deterministic `{valid, reason}` for any given trace + environment pair.

### What Is NOT Guaranteed

- **Exact timestamp reproduction**: Timestamps are recorded via `new Date().toISOString()` and will differ across replay runs. Timestamps are metadata, not replay-critical data.
- **Execution duration parity**: Step execution times (e.g., `setTimeout` delays, I/O latency) are not deterministic. Only event ordering and payload content are compared during replay verification.
- **Cross-process coordination timing**: Redis pub/sub delivery order, queue consumption timing, and inter-container communication latency are non-deterministic.
- **Floating-point consistency**: Any numeric computation involving floating-point arithmetic may produce platform-dependent results at the LSB level.

---

## 2. Supported Environments

### Verified

| Dimension    | Supported Values              | Notes                          |
| ------------ | ----------------------------- | ------------------------------ |
| OS           | Ubuntu 22.04, Debian 12       | Primary CI targets             |
| Node.js      | 18.x LTS, 20.x LTS           | Must use LTS releases          |
| Architecture | x64                           | Primary development target     |
| Filesystem   | ext4, overlayfs (Docker)      | POSIX write semantics required |
| Container    | Docker 24.x, Docker Compose 2 | Non-root, cap-drop ALL         |

### Planned Validation (Not Yet Verified)

| Dimension    | Target Values  | Status      |
| ------------ | -------------- | ----------- |
| OS           | Alpine 3.18+   | Untested    |
| Node.js      | 22.x LTS       | Untested    |
| Architecture | ARM64          | Untested    |
| Filesystem   | btrfs, xfs     | Untested    |
| Container    | Podman         | Untested    |

### Unsupported (Replay Invalid)

- Windows NTFS (path separator differences, `writeFileSync` semantics)
- Network-mounted filesystems (NFS, CIFS) — write ordering not guaranteed
- Node.js odd-numbered (non-LTS) releases
- Environments without `crypto` module (e.g., restricted runtimes)
- Containers running as root (security policy violation, not a replay issue)

---

## 3. Non-Deterministic Sources

The following are known sources of non-determinism in the runtime:

| Source                   | Impact on Replay       | Mitigation                                    |
| ------------------------ | ---------------------- | --------------------------------------------- |
| `Date.now()` / `new Date()` | Timestamps differ    | Timestamps excluded from replay comparison    |
| `uuid.v4()`             | Event IDs differ       | IDs excluded from replay comparison           |
| `setTimeout` duration   | Execution timing       | Only event ordering is compared               |
| Redis pub/sub            | Message delivery order | Not part of trace; external coordination only |
| `process.env`           | Environment variance   | Environment hash captures key variables       |
| Filesystem I/O latency  | Write timing           | `writeFileSync` ensures ordering              |
| `crypto.randomBytes`    | Random output          | Not used in trace-critical paths              |
| OS scheduler            | Thread/process timing  | Only observable through timestamp jitter       |

---

## 4. Divergence Classifications

### Fatal Divergence (Replay Fails)

These divergences cause `verifyForReplay()` to return `{ valid: false }`:

- **Environment hash mismatch**: Different platform, architecture, Node.js version, or NODE_ENV.
- **Schema version mismatch**: Trace generated with a different `IMissionEvent` schema version.
- **Missing trace file**: Referenced trace file does not exist on disk.
- **Corrupted JSON**: Trace file fails `JSON.parse()`.

### Tolerated Divergence (Replay Succeeds with Warning)

These divergences are logged but do not invalidate replay:

- **Timestamp drift**: Expected; timestamps are recording metadata only.
- **Event ID variance**: UUIDs regenerate per-run; structural matching uses `type` + `missionId` + `stepIndex`.
- **Trace file size variance**: Minor size differences from whitespace/formatting in `JSON.stringify` output.
- **Log output differences**: Logger output is side-effect only and not part of the trace contract.

### Unclassified Divergence (Requires Investigation)

- **Payload content mismatch**: Same inputs producing different `payload` values. This should not occur under controlled conditions and indicates a bug.
- **Event count mismatch**: Different number of events for the same deployment manifest. Indicates control flow divergence.
- **FailureClass mismatch**: Same error producing different failure classifications.

---

## 5. Persistence Assumptions

### Write Guarantees

- All trace writes use `fs.writeFileSync()` — synchronous, blocking writes.
- Each `recordEvent()` call writes the full accumulated trace array to disk.
- No write-ahead log (WAL). If the process crashes mid-write, the trace file may be truncated.
- Trace files are not checksummed post-write. Corruption detection relies on `JSON.parse()` at read time.

### Durability Assumptions

- Filesystem must support POSIX `fsync` semantics for `writeFileSync` to guarantee durability.
- Docker volumes using `overlayfs` are acceptable; tmpfs volumes are NOT (data lost on container restart).
- SQLite persistence (via `IPersistenceLayer`) uses default journal mode; WAL mode is not enforced.

### Recovery Behavior

- If a trace file is corrupted (JSON parse failure or checksum mismatch), the runtime throws a fatal error and halts.
- No automatic trace repair or reconstruction is attempted.
- Corrupted traces are automatically archived to `/failures/corrupted/` with environment context for forensic analysis.

---

## 6. Timing Semantics

### Bounded Timing

- **Startup budget**: 3000ms maximum (enforced by CI governance).
- **Trace replay verification**: 5000ms maximum per trace (defined in `COMPLEXITY_BUDGETS`).
- **Build time**: 30000ms maximum (enforced by CI governance).

### Non-Bounded Timing

- **Deployment step execution**: Depends on external I/O; no upper bound enforced.
- **Redis coordination latency**: Depends on network conditions; no SLA enforced at runtime level.
- **Trace file I/O**: Depends on filesystem and disk performance; no timeout enforced on `writeFileSync`.

### Clock Assumptions

- Runtime uses system wall clock (`Date.now()`). Clock skew between containers is not detected or compensated.
- NTP synchronization is assumed but not verified by the runtime.
- Monotonic clock (`process.hrtime`) is not used for any trace-critical measurements.

---

## 7. External Dependency Assumptions

| Dependency | Assumption                                      | Failure Impact                     |
| ---------- | ----------------------------------------------- | ---------------------------------- |
| Redis      | Available for pub/sub coordination              | Deployment coordination degrades   |
| Filesystem | POSIX-compliant, writable, sufficient space     | Trace persistence fails            |
| Node.js    | LTS version with crypto module                  | Environment hash generation fails  |
| Docker     | Non-root, cap-drop ALL, named volumes           | Security policy violation          |
| pnpm       | Frozen lockfile, persistent store               | Dependency reproducibility degrades|

---

## 8. Replay Verification Protocol

### Pre-Replay Checks

1. Load trace file from `ZTAN_TRACE_DIR/{missionId}.trace.json`
2. Parse JSON; if parse fails → `TRACE_CORRUPTION`, archive to `/failures/`
3. Extract `metadata.environmentHash` from trace
4. Compute current environment hash
5. Compare hashes; if mismatch → `REPLAY_DIVERGENCE`, log reason

### Replay Comparison
1. Load stored trace from `ZTAN_TRACE_DIR/{missionId}.trace.json`.
2. Normalize stored trace (strip non-deterministic fields: `id`, `timestamp`, UUIDs).
3. Re-execute deployment or load a "live" trace from a parallel run.
4. Normalize live trace using the same rules.
5. Perform event-by-event payload comparison.
6. Report divergence count and categories (Fatal vs Tolerated vs Unclassified).
7. Archive results to `/evidence/replay-matrix/`.

---

## Document Change Policy

This document is frozen for the v1.x release series. Changes require:

1. CI governance approval (no automated override)
2. Replay regression suite pass
3. Schema compatibility verification
4. Updated OTM report documenting the change rationale
## 9. Evidentiary Credibility

The ZTAN trace format is designed to function as a forensic evidence artifact rather than a simple log file.

### 9.1 Hash-Chain Integrity (Tamper Evidence)

Every trace uses a cryptographically chained event sequence. Each event `n` contains:
- `previousHash`: The SHA-256 hash of event `n-1`.
- `eventHash`: The SHA-256 hash of (`previousHash` + canonical event body).

This creates a linked list of evidence. Modifying a historical event (e.g., event 10 in a 100-event trace) requires recomputing the `eventHash` and all subsequent `previousHash`/`eventHash` pairs in the chain.

### 9.2 Durability Boundary (Parent Directory Sync)

To ensure that atomic renames are truly durable across power failure, ZTAN runtime performs a directory `fsync` (on supported filesystems) after every trace write. This ensures that the file's metadata (its existence and pointer to blocks) is flushed to persistent storage.

### 9.3 Trust Model: Three-Tier Assurance

ZTAN provides a layered trust model. Each tier builds on the previous, but operators and auditors MUST understand which tier their deployment satisfies.

| Tier | Property | Mechanism | Status |
|------|----------|-----------|--------|
| 1 | **Integrity** | SHA-256 hash-chain, canonical checksums | ✅ Guaranteed |
| 2 | **Operator Attestation** | Ed25519 detached signature of `tailHash` | ✅ Provided |
| 3 | **External Accountability** | Remote Transparency Witness, notarized receipts | ✅ Integrated |
| 4 | **Verifiable Transparency** | Merkle Inclusion Proofs, consistency validation | ✅ Integrated |

**Tier 1 — Integrity**: The trace has not been modified since creation. Any byte-level change invalidates the hash chain. This is guaranteed by the runtime.

**Tier 2 — Operator Attestation**: The trace was signed by a specific Ed25519 private key. An auditor with the corresponding public key can verify authorship. However, if the operator has access to the private key file (`.ztan/keys/signing.key`), they can re-sign a forged chain. This tier provides **operator-level non-repudiation** — the operator's key signed it — but NOT **external accountability**.

**Tier 3 — External Accountability**: ZTAN integrates with an external **Transparency Witness** (see `packages/ztan-witness`). Upon trace sealing, the runtime submits the receipt to a remote witness server which provides a second, independent Ed25519 signature (`.receipt.witness.json`). This creates a cryptographic "checkpoint" that the operator cannot retroactively rewrite without the witness's collusion. This tier provides **fork-prevention** and **external non-repudiation**.

**Tier 4 — Verifiable Transparency**: The witness server maintains an append-only **Merkle Tree** of all observed receipts. Every witness receipt includes a **Merkle Inclusion Proof**, allowing an auditor to verify that their mission is part of the witness's permanent, immutable log. This prevents the witness from selectively forgetting missions or presenting different histories to different auditors (**equivocation resistance**).

---

## 10. Canonicalization & Attestation

### 10.1 Canonical JSON (v1, RFC 8785 aligned)

To ensure cross-runtime hash stability, ZTAN mandates the **Canonical JSON Encoding Specification v1** (see `docs/CANONICAL_JSON.md`).
- All objects are serialized with lexicographic key ordering (UTF-16 code unit).
- Whitespace is stripped from all hash inputs.
- `undefined` values are omitted; `null` values are preserved.
- `NaN`, `Infinity`, and `BigInt` are prohibited.
- Aligned with RFC 8785 (JSON Canonicalization Scheme).

This ensures that a trace generated on Linux x64 with Node v20 produces the identical cryptographic chain as a replay on macOS ARM64 with Node v22.

### 10.2 Authorship & Governance Receipts

ZTAN uses **Ed25519 asymmetric cryptography** for governance receipts.

- **chainRoot**: SHA-256 hash of the first event in the mission chain.
- **governanceReceipt**: Base64-encoded Ed25519 detached signature of the `chainRoot`.
- **signerKeyId**: SHA-256 fingerprint of the signer's public key.


---

## 11. NDJSON Journaling & Receipt Consistency

The ZTAN architecture enforces an explicit separation between the evidence stream (`.trace.ndjson`) and the attestational metadata (`.receipt.json`).

### 11.1 Partial-Line Recovery Semantics
Because the `.trace.ndjson` journal is strictly append-only, power failures or process crashes may occur mid-append, leaving a trailing partial JSON string. 
ZTAN defines the following recovery semantics:
- Verification pipelines MUST tolerate trailing JSON parse failures ONLY if they occur on the final line of the stream.
- Truncated trailing events are discarded, and the trace is marked with a `PARTIAL_TAIL` warning.
- Any JSON parse failure occurring *before* the final line indicates catastrophic trace corruption and MUST result in a `FATAL` validation failure.

### 11.2 Receipt Consistency Guarantees
The **journal is the absolute source of truth**; the **receipt is purely an attestational snapshot**. 
If the runtime crashes after appending a valid event to the journal but *before* updating the receipt, the receipt's `tailHash` will point to a historical event in the chain rather than the final appended event.
- ZTAN verifiers MUST support **Unattested Tail Recovery**.
- By scanning backward through the valid hash-chain, verifiers can match the receipt's `tailHash` to the exact event that was successfully attested.
- The chain up to the matched event is considered fully **Attested**. 
- Subsequent trailing events are cryptographically valid locally but lack operator attestation, yielding an `UNATTESTED_TAIL` warning rather than failing the trace verification.

### 11.3 Immutable Segment Sealing
Upon completion of a mission, the trace recorder emits a final `SEAL` event.
Once this event is appended and the final receipt is written, the runtime enforces OS-level immutability by removing all write permissions (`0o444` on POSIX systems) from both the journal and the receipt.
This formally closes the append-only window and protects the trace against accidental historical modification before it is archived or transmitted to external auditors.

**Why Ed25519, not HMAC**: HMAC is symmetric — the verifier and signer share the same secret. This means anyone who can verify can also forge. Ed25519 is asymmetric — the verifier holds only the public key and **cannot** produce valid signatures. This is the minimum requirement for any system claiming attestable authorship.
