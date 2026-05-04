# ZTAN-RFC-002: Validated Coordinated MPC Protocol v1.0

## 1. Abstract
This document specifies the Validated Coordinated MPC protocol for the Zero-Trust Audit Network (ZTAN). It provides a production-grade infrastructure for Distributed Key Generation (DKG) and Threshold Signing using FROST and Pedersen VSS, hardened with enforced identity integrity and verifiable transparency.

## 2. Participant Identity Binding
The system MUST maintain a canonical **Identity Registry** that binds every `nodeId` to its unique `publicKey` (48-byte compressed G1).

- **Registry Enforcement**: The Coordinator MUST NOT accept any protocol contribution from a `nodeId` that is not present and `ACTIVE` in the registry.
- **Identity Spoofing Prevention**: Public keys MUST be validated for length and format (48-byte hex) and MUST NOT be trusted if provided in-band within protocol messages.

## 3. Authenticated MPC Messages
All contributions to the protocol MUST be identity-signed **AuthenticatedMessages**.

### 3.1 Structure
```text
struct {
    ZTANField nodeId;       /* Registered Node ID */
    ZTANField ceremonyId;   /* Unique session ID */
    ZTANField round;        /* e.g., DKG_ROUND_1, SIGNING */
    ZTANField payload;      /* Round-specific data */
    uint64    timestamp;    /* Milliseconds since epoch */
    ZTANField signature;    /* BLS signature */
} AuthenticatedMessage;
```

### 3.2 Verification Logic
The signature MUST be verified over the preimage:
`M = SHA256(nodeId || payload || timestamp)`

- **Replay Protection**: The `timestamp` MUST be within a 30-second window of the Coordinator's local time.
- **Context Binding**: `ceremonyId` and `round` MUST match the current session state.

## 4. Fraud Accountability System
The protocol MUST NOT fail silently. All malicious or malformed contributions MUST be recorded for audit.

- **VSS Fraud Detection**: During DKG Round 2, aggregated shares $S_i$ MUST be verified against public commitments.
- **Accountability**: Any failure results in the participant being marked as `FRAUD_DETECTED`.
- **Quorum Survival**: The ceremony SHALL proceed if the number of healthy participants remains $\ge threshold$. Otherwise, it MUST transition to `ABORTED`.

## 5. Coordinator Transparency (Transcript)
The Coordinator MUST maintain a strictly-ordered, sequence-aware **Ceremony Transcript**.

- **Transcript Record**: Every verified message is appended to the log with an atomic sequence index.
- **Auditor Guarantee**: The transcript ensures that the Coordinator cannot reorder, omit, or delay messages without detection by external auditors.

## 6. Operational Constraints
1. **Redlock Persistence**: All state transitions MUST be protected by distributed locking to ensure atomic transcript and status updates.
2. **Timeout Enforcement**: Active ceremonies idle for >60s MUST be aborted to ensure system liveness.
