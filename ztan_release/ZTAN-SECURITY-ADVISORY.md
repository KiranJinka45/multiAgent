# ZTAN Security Advisory & Assumption Log

## 📜 Overview
This document explicitly states the security assumptions and known limitations of the Zero-Trust Audit Network (ZTAN) v1.5 infrastructure. These disclosures are mandatory for audit transparency.

---

## 🔐 1. Coordinator Assumption (Message Ordering)
**Assumption:** ZTAN currently utilizes a **Coordinator-Assisted FROST** model. 
**Limitation:** While all participant contributions (commitments, shares, partial signatures) are cryptographically signed and independently verifiable, the Coordinator is responsible for the canonical ordering of these events in the transcript.
**Mitigation:** The Coordinator generates a hash-linked transparency transcript. Any attempt to reorder or omit messages after they are acknowledged will break the hash chain, making the fraud detectable by any external auditor.

## 🤝 2. Lack of P2P Authenticated Channels
**Assumption:** Nodes communicate through the Coordinator (Hub-and-Spoke).
**Limitation:** There are no direct P2P authenticated channels between participants.
**Mitigation:** Confidential shares (Round 2) are encrypted for the recipient's public key (VSS) before being sent to the Coordinator. This ensures that only the intended recipient can decode the share, even if the Coordinator is malicious.

## 🔑 3. Key Management Lifecycle
**Assumption:** Node identities are managed by the `IdentityService` registry.
**Limitation:** In the current reference implementation, the registry is service-local.
**Mitigation:** Phase 5 implemented explicit **Revocation** and **Rotation** logic. If a node key is compromised, it can be moved to `REVOKED` status, which immediately terminates its ability to contribute to any active or future ceremonies.

## 📦 4. Data Immutability
**Assumption:** Proof bundles are exported for long-term storage.
**Limitation:** Redis state is ephemeral (TTL 1h).
**Mitigation:** The `ProofArchiveService` implements an append-only logic (simulated) to ensure that once an audit proof is committed, it cannot be overwritten or deleted during its retention period.

---

## 📊 Audit Readiness Status
| Gap | Status | Resolution |
| :--- | :--- | :--- |
| Key Rotation | ✅ FIXED | Implemented in `IdentityService` |
| Revocation | ✅ FIXED | Implemented in `IdentityService` |
| Schema Versioning | ✅ FIXED | Added to `ProofBundle` |
| Payload Limits | ✅ FIXED | Enforced in `middleware.ts` |
| Long-term Storage | ✅ FIXED | `ProofArchiveService` deployed |

## ⏱️ 5. Timestamp Trust Model
**Assumption:** The Coordinator provides the reference time for ceremony checkpoints.
**Limitation:** Protocol liveness depends on nodes having reasonably synchronized clocks.
**Mitigation:** 
- A strict **+/- 30-second window** is enforced for all message timestamps relative to server time.
- Messages outside this window are rejected to prevent replay attacks and protocol stagnation.
- **Requirement:** All production nodes MUST be NTP-synchronized to ensure participation liveness.
