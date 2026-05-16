# ZTAN-RFC-001 v1.5: Audit-Grade Threshold Signature Standard

**Status**: PROPOSED STANDARD (LOCKED)  
**Version**: 1.5.0  
**Date**: 2026-05-04  
**Authors**: ZTAN Infrastructure Team (Google Deepmind / Antigravity)

---

## 1. Abstract
This document defines the Zero-Trust Audit Network (ZTAN) cryptographic protocol for verifiable, non-repudiable audit trails. It specifies a canonical encoding format (CER v1.5) and a semantic binding construction for BLS12-381 threshold signatures to ensure absolute cross-runtime determinism and replay resistance.

## 2. Canonical Encoding (CER v1.5)
All variable-length data structures MUST follow the Length-Prefix (LP) encoding to avoid injection attacks and ambiguity.

### 2.1 Integer Encoding
All integers MUST be encoded as **Big-Endian**.
- `uint32BE(x)`: 4 bytes
- `uint64BE(x)`: 8 bytes

### 2.2 Field Encoding
`encodeField(data) = uint32BE(length(data)) || data`

## 3. Semantic Binding Construction
To prevent "Same Signature, Different Meaning" attacks, the signature MUST be bound to its full context.

### 3.1 Components
1. **Ceremony ID**: Unique identifier for the signing session.
2. **Threshold**: Minimum number of participants required.
3. **Signer Set**: The full list of eligible public keys, sorted lexicographically by bytes.
4. **Message Hash**: The SHA-256 hash of the audit evidence.

### 3.2 Binding Layout
```text
BindingPayload = 
  encodeField(ceremonyId) ||
  uint32BE(threshold) ||
  encodeField(sortedPublicKeys) ||
  encodeField(messageHash)
```

`sortedPublicKeys` is the byte-wise concatenation of all compressed G1 public keys in the eligible set, sorted by value.

### 3.3 Final Hash
`BindingHash = SHA256(BindingPayload)`

## 4. Cryptographic Primitives
- **Curve**: BLS12-381
- **Signature Type**: Basic BLS (Point on G2)
- **Domain Separation Tag (DST)**: `BLS_SIG_ZTAN_AUDIT_V1`
- **Hash Function**: SHA-256

### 4.1 Public Key and Signature Rules
To ensure cross-runtime determinism and avoid cryptographic traps, all points MUST follow these rules:
1. **Public Keys**: MUST be **compressed G1** representation (Exactly 48 bytes).
2. **Signatures**: MUST be **compressed G2** representation (Exactly 96 bytes).
3. **Subgroup Check**: Implementations MUST perform subgroup membership checks on all incoming points. Points not on the curve or in the correct prime-order subgroup MUST be rejected.
4. **Point at Infinity**: The point at infinity is not allowed for individual public keys or signatures and MUST be rejected.
5. **Canonical Sorting**: When forming the `sortedPublicKeys` field, keys MUST be compared and sorted by their **raw byte values** (lexicographical byte-wise order).
6. **DST Lock**: The DST is a normative constant and MUST NOT be configurable at runtime.

## 5. Security Guarantees
1. **Session Isolation**: A signature from one ceremony is invalid for any other ceremony.
2. **Quorum Integrity**: The proof is invalid if the threshold or the set of potential signers is altered.
3. **Non-Repudiation**: A valid proof demonstrates that at least `t` participants from the known set agreed to the payload.

---

## 6. Test Vectors
Reference implementations SHOULD validate against `vectors.json`.

### 6.1 Vector 1 (Base Case)
- **Ceremony ID**: `CER-001`
- **Threshold**: `2`
- **Keys**: `[7289..., 82a3...]`
- **Binding Hash**: `893c83693e433434190c1f4e15a78248c8230554f676643666f28198f6735624`
