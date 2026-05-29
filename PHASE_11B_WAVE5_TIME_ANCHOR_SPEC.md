# 🛠️ ZTAN Phase 11B — Wave 5: Tier H4 Time Anchoring Specification
**The Concrete Execution Guide for Chronological Non-Repudiation**

> [!IMPORTANT]
> **Wave 5 Engineering Boundary: Hardware Clock Verification**
> Transaction measurements and hardware provenance are insufficient if an attacker can manipulate the local clock to bypass expiration epochs or replay ancient transactions.
> We explicitly define:
> `Host Proposal ──[TSA Timestamp Token]──► Witness Validation ──[Rekor Ledger Append]──► Confirmed State`

---

## 🏛️ 1. Trusted RFC 3161 Timestamping

The ZTAN Witness Node must not rely on the local operating system clock for the chronological ordering of the consensus ledger.

### 1.1 Time-Stamp Token (TST) Envelope
* **Cryptographic Binding:** The payload hash of a state transition is sent to an external, trusted Time-Stamping Authority (TSA).
* **Non-Repudiable Embedding:** The TSA returns a cryptographically signed token (TST) proving that the exact payload existed at the exact hardware-backed time. This TST is embedded permanently into the ZTAN ledger entry.

### 1.2 Clock-Drift Hard Quarantine
* **Continuous Verification:** The local host clock is continuously compared against the trusted TSA time.
* **10ms Lockdown Transition:** If the drift between the local clock and the authoritative clock exceeds 10 milliseconds, the system assumes NTP manipulation or hardware compromise. The Witness node immediately enters a `READ_ONLY` quarantine state and rejects all co-signing operations.

---

## 🏛️ 2. Rekor Transparency Ledger Anchoring

Local, immutable ledgers are still vulnerable to physical hardware destruction or complete host rollback (history rewriting). We eliminate this by publishing state hashes publicly.

### 2.1 Public Verification
* Every state transition successfully co-signed by the Detached Witness must be appended to an append-only transparency log (Rekor).
* The Rekor service returns an inclusion proof (a Merkle tree proof) that permanently binds the ZTAN transaction into the public, mathematically verifiable timeline.

---

## 🚫 3. Explicit Non-Goals & Blockers for Wave 5
* ❌ **No Live freetsa.org / Rekor Integrations:** For this execution, we use a `MockTSA` and `MockRekor` to ensure stable, offline CI testing.
* ❌ **No P2P Clock Voting:** We rely strictly on authoritative signed hardware clocks, deliberately avoiding decentralized, multi-node clock voting algorithms which are complex and easily partitioned.

---

## 📊 4. Objective Wave 5 Verification Metrics
* **TST Embedding:** The final ledger payload must contain a cryptographically generated timestamp signature.
* **Clock Quarantine Halt:** The Witness must immediately throw a `QuarantineError` when simulated local time diverges from the simulated TSA time by >10ms.
* **Transparency Ledger Append:** The transaction hash must be confirmed written to the mock Rekor log.
