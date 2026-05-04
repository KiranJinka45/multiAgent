# ZTAN Canonical Encoding Specification (RFC-Style Draft)

**Version:** `ZTAN_CANONICAL_V1`
**Signer Domain Separation:** `ZTAN_SIGNER_SET_V1`
**Hash Algorithm:** SHA-256 (FIPS 180-4)
**Endianness:** All integer encodings MUST be 4-byte (32-bit) Big-Endian (`UInt32BE`). All `UInt32BE` values MUST be within the range [0, 2^32 - 1]. Values outside this range MUST result in rejection.

This document defines the strict, structurally unambiguous byte-level rules for constructing the canonical cryptographic payload required for threshold signatures in the Zero-Trust Audit Network (ZTAN). 

## 1. Formal ABNF Grammar

The canonical byte construction follows this strict Augmented Backus-Naur Form (ABNF):

```abnf
CanonicalPayload    = VersionTag PayloadHash SignerSetHash
VersionTag          = EncodeField("ZTAN_CANONICAL_V1")
PayloadHash         = EncodeField(32OCTET) ; Exactly 32 bytes (SHA-256)
SignerSetHash       = EncodeField(32OCTET) ; Exactly 32 bytes (SHA-256)

SignerSetBytes      = SignerDomainTag ParticipantCount 1*ParticipantID Threshold
SignerDomainTag     = EncodeField("ZTAN_SIGNER_SET_V1")
ParticipantCount    = UInt32BE
ParticipantID       = EncodeField(1*256OCTET) ; NFC normalized, UTF-8 encoded
Threshold           = UInt32BE

EncodeField(data)   = LengthPrefix data
LengthPrefix        = UInt32BE
```

> [!NOTE]
> `SignerSetHash` MUST be computed as `SHA-256(SignerSetBytes)` where `SignerSetBytes` is the exact byte concatenation defined above, including the `SignerDomainTag`. `SignerSetHash` MUST be computed over the exact byte sequence of `SignerSetBytes` with no transformation, padding, or re-encoding. ABNF is used for descriptive purposes only. The explicit binary encoding described herein is normative.

## 2. Invariants & Composition Rules

### 2.1 Error Determinism
All ZTAN implementations MUST produce deterministic rejection invariant of runtime context. Invalid inputs MUST throw an error, halting cryptographic operations immediately.

### 2.2 Payload Composition
To decouple the canonical layer from application-level serialization complexity, the input `PayloadBytes` MUST be exactly 32 bytes long, representing a pre-computed SHA-256 hash of the target object. The canonical layer does NOT process raw payloads. It MUST NOT be arbitrary binary or JSON data.

### 2.3 Concatenation Integrity
All byte concatenation MUST be performed in strict left-to-right order with ZERO padding, alignment, or implicit delimiters.

### 2.4 Constant-Time Execution
Implementations SHOULD use constant-time comparisons for cryptographic verification. Implementations handling adversarial input in shared environments MUST use constant-time comparisons.

### 2.5 Domain Separation
To prevent hash collision attacks across disparate ZTAN subsystems, the `SignerSetBytes` computation MUST be prepended with the explicit domain tag `"ZTAN_SIGNER_SET_V1"`.

### 2.6 Parsing Strictness
Implementations MUST NOT apply implicit decoding, trimming, or transformation to binary fields during parsing. All fields MUST be interpreted exactly as encoded.

## 3. String Normalization & Identity Semantics

To prevent semantic equivalence collisions (e.g., Unicode composed vs decomposed forms):
1. **Normalization:** All string IDs MUST be normalized to Unicode Normalization Form C (`NFC`) as defined by Unicode Standard Annex #15. Implementations SHOULD use a Unicode library compliant with Unicode version 15.0 or later.
2. **Lowercasing:** Signer IDs MUST be converted to lowercase AFTER normalization. Lowercasing MUST be performed using locale-independent Unicode case folding (e.g., toLowerCase with locale-insensitive semantics or Unicode simple case folding).
3. **Trimming:** Signer IDs MUST have leading/trailing whitespace removed.
4. **Encoding:** All string inputs MUST be valid Unicode strings prior to UTF-8 encoding. Invalid UTF-8 sequences or decoding errors MUST result in rejection. Strings MUST be strictly encoded to UTF-8.
5. **Identity Semantics (Deduplication):** If multiple participant IDs normalize to identical UTF-8 byte arrays, they MUST be treated as a single participant entry (deduplication).
6. **Sorting:** Unique arrays MUST be sorted via **Unsigned Byte-Wise Lexicographical Order** (equivalent to `memcmp` on the UTF-8 bytes).

## 4. Rejection Rules (Bounds)

Any ZTAN node or verification client MUST explicitly REJECT inputs and throw an error if any of the following conditions are met:

- **Empty Participant List:** The number of unique participants is `0`.
- **Invalid Threshold:** The consensus threshold is `<= 0`.
- **Threshold Exceeds Quorum:** The threshold is `> ParticipantCount`. `Threshold` MUST be encoded as `UInt32BE` and validated prior to encoding. Threshold evaluation MUST be applied AFTER canonicalization (i.e., against the deduplicated, normalized set).
- **Participant Bound Exceeded:** The number of unique participants exceeds `MAX_PARTICIPANTS` (1024).
- **ID Bound Exceeded:** Any single participant ID (after NFC normalization) exceeds `MAX_ID_BYTES` (256 bytes).
- **Payload Constraint Violated:** The target payload length is NOT exactly 32 bytes.
- **Parsing Completeness:** `CanonicalPayloadBytes` MUST be fully consumed during parsing. Any trailing or unused bytes MUST result in rejection.

## 5. Conformance & Test Vectors

Conforming implementations MUST reproduce the canonical outputs defined in the official test vectors (TV-001 through TV-014). Failure to reproduce these outputs indicates non-compliance. Given identical inputs, all conforming implementations MUST produce identical byte output and hash results, strictly mirroring the rejection rules outlined herein.
