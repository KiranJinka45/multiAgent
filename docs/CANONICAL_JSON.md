# ZTAN Canonical JSON Encoding Specification (v1)

> Aligned with RFC 8785 (JSON Canonicalization Scheme)

This document formally defines the deterministic serialization requirements for all ZTAN forensic hash inputs.

## 1. Goal

Ensure that the same semantic JSON object always produces the identical UTF-8 byte stream across different Node.js versions, platforms, language implementations, and object memory layouts. This is a prerequisite for stable cryptographic hash chaining and cross-runtime replay.

## 2. Normative Reference

This specification is aligned with **RFC 8785 — JSON Canonicalization Scheme (JCS)**. Where ZTAN-specific deviations exist, they are documented in Section 5.

## 3. Serialization Rules

Any object or array passed to the ZTAN hashing engine must follow these rules:

1. **Lexicographic Key Ordering**: Object keys MUST be sorted by UTF-16 code unit value (matching `Array.prototype.sort()` default behavior in ECMAScript).
   - *Example*: `{"b": 1, "a": 2}` → `{"a":2,"b":1}`

2. **No Whitespace**: No spaces, newlines, or tabs between tokens. Output MUST be minimal-length JSON.

3. **Undefined Omission**: Properties with `undefined` values MUST be omitted entirely. `null` values MUST be preserved as `null`.

4. **Number Serialization**: Numbers MUST follow ECMAScript `JSON.stringify()` behavior (IEEE 754 double precision). The following are PROHIBITED and MUST trigger a serialization error:
   - `NaN`
   - `Infinity` / `-Infinity`
   - `BigInt` values (not representable in JSON)

5. **Unicode Handling**: String values MUST be UTF-8 encoded. Unicode escape sequences (`\uXXXX`) MUST follow ECMAScript `JSON.stringify()` behavior. No Unicode normalization (NFC/NFD) is applied — byte-level identity is required.

6. **Escape Sequences**: String escaping MUST follow the ECMAScript `JSON.stringify()` specification exactly. Only the mandatory escapes (`\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, and `\uXXXX` for control characters U+0000–U+001F) are applied.

7. **Binary Data**: Binary blobs MUST NOT appear directly in canonicalized objects. If binary data must be included, it MUST be pre-encoded as Base64 strings before canonicalization.

8. **Null vs Missing**: `null` is a value; `undefined`/missing is absence. These are semantically distinct and handled differently (rule 3).

9. **No Trailing Commas**: Arrays and objects MUST NOT include trailing commas.

10. **Recursive Application**: All rules apply recursively to nested objects and arrays.

## 4. Reference Implementation

```typescript
function canonicalize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
        return '[' + obj.map(item => canonicalize(item)).join(',') + ']';
    }

    const keys = Object.keys(obj).sort();
    const parts = [];
    for (const key of keys) {
        const val = obj[key];
        if (val !== undefined) {
            parts.push(JSON.stringify(key) + ':' + canonicalize(val));
        }
    }
    return '{' + parts.join(',') + '}';
}
```

## 5. Deviations from RFC 8785

| Area | RFC 8785 | ZTAN v1 | Rationale |
|------|----------|---------|-----------|
| Unicode normalization | Not specified | Not applied (byte identity) | ZTAN operates in a single-language (Node.js) ecosystem; byte identity is sufficient. Cross-language implementations MUST ensure identical `JSON.stringify()` behavior. |
| Number formatting | ES2015 `toString()` | `JSON.stringify()` | Equivalent in practice for IEEE 754 doubles. |
| `undefined` handling | Not applicable (not valid JSON) | Omitted | ECMAScript-specific; necessary for ZTAN's TypeScript codebase. |

## 6. Usage in ZTAN

- **Event Hashing**: `eventHash = SHA256(previousHash + canonicalize(eventBody))`
- **Trace Checksum**: `checksum = SHA256(canonicalize(traceArray))`
- **Environment Hash**: `environmentHash = SHA256(canonicalize(envObject))`

## 7. Verification Invariant

For any two objects `A` and `B`:

```
deepEqual(A, B) === true  →  canonicalize(A) === canonicalize(B)
```

This MUST hold regardless of property insertion order, memory layout, or JavaScript engine implementation.
