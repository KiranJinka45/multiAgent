# ZTAN-RFC-001: Canonical Encoding Rules (CER) v1.5

## 1. Abstract
This document defines the Canonical Encoding Rules (CER) for the Zero-Trust Audit Network (ZTAN). It provides a formally specified, byte-stable transformation of audit data for cryptographic hashing and multi-party signing. This version (1.5) refines formal claims and expands the security model to achieve "audit-ready" status.

## 2. Conventions and Terminology
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

## 3. Cryptographic Primitives
- **Hashing**: SHA-256 (FIPS 180-4) is MANDATORY and bound to this protocol version.
- **Consensus Signatures**: BLS12-381 (Aggregated over G2).
- **Domain Separation Tag (DST)**: MUST be the ASCII-encoded byte string: `BLS_SIG_ZTAN_AUDIT_V1`.

## 4. Formal Binary Layout (TLS-Style)
The structure of the canonical payload is defined using the following TLS-style struct notation (RFC 8446):

```text
struct {
    uint32 length;
    opaque data[length];
} ZTANField;

struct {
    ZTANField versionTag;       /* MUST be "ZTAN_CANONICAL_V1" */
    ZTANField auditId;          /* NFC normalized UTF-8, max 1,048,576 bytes */
    uint64    timestamp;        /* Milliseconds since epoch, Big-Endian */
    ZTANField payloadHash;      /* Exactly 32 bytes */
    uint32    threshold;        /* Minimum required signatures */
    uint32    nodeCount;        /* Number of participant IDs, max 1024 */
    ZTANField nodeIds[nodeCount]; /* Individually prefixed, lexicographically sorted */
} ZTANPayload;
```

## 5. Security Model & Assumptions
### 5.1. Threat Model
- **Network Model**: The system assumes an asynchronous network where the adversary can delay or reorder messages.
- **Adversary Capability**: The adversary can compromise up to `threshold - 1` participants.
- **Replay Protection**: The binding of `payloadHash` and `timestamp` ensures that every audit event is unique. Implementations MUST ensure `auditId` + `timestamp` uniqueness within their local state.
- **Key Registration**: It is assumed that public keys are registered via a trusted phase and authenticated via Proof-of-Possession (PoP).

### 5.2. Integrity & Injectivity
The encoding is **constructed to be injective** under the defined constraints. No two distinct `ZTANPayload` inputs (within the defined size limits and normalization rules) SHALL map to the same binary representation.

## 6. Consensus Signing and Aggregation
### 6.1. Signing Preimage
To ensure a **fixed-size signing preimage**, the message `M` for BLS12-381 signing is the SHA-256 hash of the `ZTANPayload`.
```text
M = SHA256(ZTANPayload)
Signature = BLS_Sign(SK, M, DST="BLS_SIG_ZTAN_AUDIT_V1")
```

### 6.2. Aggregation
Partial signatures `S_1, S_2, ..., S_k` are aggregated via elliptic curve point addition in G2:
```text
S_agg = S_1 + S_2 + ... + S_k
```
Verification of the aggregated signature `S_agg` is performed against the aggregated public key `PK_agg = PK_1 + PK_2 + ... + PK_k`.

## 7. Operational Constraints
1. **Domain Separation**: The `ZTANPayload` binary format MUST NOT be reused for other protocol contexts to prevent cross-domain replay attacks.
2. **Strict Rejection**: Unknown versions, oversized fields, or duplicates detected after normalization MUST result in a fatal REJECT.

## 8. Reference Test Vectors (ZTAN-RFC-001-V1.5)

### 8.1. Positive Vector (Complex)
- **auditId**: `RFC-COMPLEX-🎉-V1.4`
- **timestamp**: `1714732800000`
- **SHA-256 Hash**: `7289f43e5f05ee3e51a1bec6fc5d3cd04b7fd40c315a1296ca4d10d4dd5ff402`

### 8.2. Negative (Rejection) Vectors
| Scenario | Input Value | Reason for Rejection |
| :--- | :--- | :--- |
| **Invalid UTF-16** | `auditId = "ID\uD800"` | Lone surrogate in UTF-16 string. |
| **NFC Duplicate** | `nodeIds = ["e\u0301", "é"]` | Collision after NFC normalization. |
| **Oversize ID** | `auditId.length = 1MB + 1` | Exceeds `MAX_AUDIT_ID_BYTES`. |
| **Threshold Error** | `threshold = 3, count = 2` | Threshold exceeds participant count. |
