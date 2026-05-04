# ZTAN-RFC-002: Validated Coordinated MPC Protocol v1.1

## 1. Abstract
This document specifies the Validated Coordinated MPC protocol for the Zero-Trust Audit Network (ZTAN). It defines a production-grade infrastructure for Distributed Key Generation (DKG) and Threshold Signing using FROST (Flexible Round-Optimized Schnorr Threshold signatures) and Pedersen Vifiable Secret Sharing (VSS).

## 2. Protocol Goals
- **Decentralized Integrity**: No single party (including the Coordinator) can forge signatures.
- **Adversarial Resilience**: Protection against coordinator spoofing and malicious participants.
- **Operational Robustness**: Distributed locking and timeout mechanisms to ensure state consistency.

## 3. Participant Authentication
Every contribution to the MPC protocol MUST be encapsulated in an **AuthenticatedMessage**.

### 3.1 AuthenticatedMessage Structure
```text
struct {
    ZTANField nodeId;       /* Identity of the participant */
    ZTANField ceremonyId;   /* Unique session ID */
    ZTANField round;        /* Protocol round (e.g., DKG_ROUND_1) */
    ZTANField payload;      /* Round-specific data (JSON/Hex) */
    ZTANField signature;    /* BLS signature of (nodeId + ceremonyId + round + payload) */
} AuthenticatedMessage;
```
All signatures MUST use the participant's registered identity key pair.

### 3.2 Identity Registry
The Coordinator MUST maintain an **Identity Registry** (or link to a PKI) that binds every `nodeId` to its canonical public key.
- **Verification**: During any protocol round, the Coordinator MUST fetch the public key from the registry for verification.
- **Spoofing Prevention**: Messages from nodes not present in the registry MUST be rejected immediately.

## 4. DKG Round 1: Commitments
Participants generate a polynomial $f(i)$ of degree $t-1$ and publish Pedersen commitments $C_{i,j} = a_{i,j} \cdot G_1$.
- **Requirement**: Commitments MUST be published as an AuthenticatedMessage.
- **Verification**: The Coordinator verifies the identity signature before accepting.

## 5. DKG Round 2: Share Exchange
Participants compute secret shares $s_{i,j} = f_i(j)$ for every other participant $j$.
- **Requirement**: Shares MUST be exchanged via AuthenticatedMessages.
- **VSS Verification**: Upon receiving all shares, each participant (and the Coordinator) MUST verify the aggregated share $S_i$ against the combined public commitments:
  $S_i \cdot G_1 = \sum_{j=1}^n \sum_{k=0}^{t-1} (i^k \cdot C_{j,k})$
- **Accountability**: If VSS verification fails, the Coordinator MUST identify the specific offending node and mark its status as `FRAUD_DETECTED`.
- **Fail-Fast**: Any VSS failure results in a ceremony **ABORT** for the current session, providing cryptographic proof of the participant's breach.

## 6. Threshold Signing Phase
Participants generate partial signatures using their secret shares.
- **Context Binding**: Partial signatures MUST be bound to the `ceremonyId` and `messageHash`.
- **Identity Binding**: Partial signatures MUST be wrapped in an AuthenticatedMessage proving the identity of the signer.

## 7. Operational Safeguards
### 7.1. Distributed Locking
All state updates to the ceremony MUST be protected by a distributed lock (e.g., Redlock) to prevent race conditions during concurrent participant submissions.

### 7.2. Timeout Watchdog
The system MUST monitor the `lastUpdate` timestamp of every active ceremony.
- **Timeout**: Ceremonies idle for more than 60 seconds MUST be moved to the `ABORTED` state.
- **Resource Cleanup**: Aborted ceremonies release all associated Redis memory and temporary state.

### 7.3. Coordinator Transparency (Verifiable Transcript)
To make the Coordinator's behavior auditable, it MUST maintain a **Ceremony Transcript**.
- **Transcript Record**: Every verified contribution MUST be appended to an ordered log containing:
    - Sequence Index
    - Arrival Timestamp
    - Node ID
    - Protocol Round
    - Payload Hash (Fingerprint)
- **Auditability**: The transcript allows external auditors to verify that the Coordinator did not reorder or omit messages to bias the outcome.

## 8. Security Limitations
- **Coordinated Model**: While cryptographically decentralized, the current implementation relies on a central Coordinator for message routing. A malicious Coordinator can deny service (DOS) but cannot compromise integrity or non-repudiation.
- **Identity Trust**: The protocol relies on a pre-established PKI for participant identities.
