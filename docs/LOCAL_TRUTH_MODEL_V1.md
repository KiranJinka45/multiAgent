# 🛡️ LOCAL_TRUTH_MODEL_V1

**Version**: 1.0.0  
**Status**: FROZEN  
**Mandate**: This document defines the constitutional requirements for institutional execution finality. No witness may sign an envelope that does not adhere to these semantic rules.

---

## 1. Canonical Execution Envelope

The `FinalizedEnvelope` is the atomic unit of institutional truth. It must be bit-identical across all replay attempts.

### 1.1 Field Specification (Canonical Order)

| Field | Type | Hashed? | Purpose |
|-------|------|---------|---------|
| `version` | `string` | YES | Schema version (e.g., "1.0.0") |
| `missionId` | `string` | YES | Institutional context anchor |
| `executionId` | `string` | YES | Unique execution identifier |
| `lineage.mountHash` | `string` | YES | SHA256 of normalized mounts |
| `lineage.executionHash` | `string` | YES | SHA256 of normalized workload |
| `outcome.exitCode` | `number` | YES | Terminal exit status |
| `outcome.securityEvent` | `string \| null` | YES | Detected boundary violations |
| `timestamp` | `string` | YES | Normalized ISO 8601 (UTC) |

### 1.2 Serialization Rules
- **Key Ordering**: All objects must have keys sorted lexicographically before hashing.
- **Normalization**:
  - `timestamp`: Must be `YYYY-MM-DDTHH:mm:ss.sssZ` format.
  - `mounts`: Must strip host-specific paths; only `target` and `mode` are hashed.
  - `env`: Environment variables must be sorted by key.
  - `args`: Command arguments must be preserved exactly as passed to the sandbox.

---

## 2. Hash Semantics (SHA256)

### 2.1 Mount Hash Calculation
1. Map `SandboxMount[]` to `NormalizedMount[]`.
2. `NormalizedMount` contains only `{ target, mode }`.
3. Sort `NormalizedMount[]` by `target`.
4. Serialize to Canonical JSON.
5. Compute SHA256.

### 2.2 Execution Hash Calculation
1. Construct `NormalizedWorkload`.
2. `NormalizedWorkload` contains `{ command, args, env }`.
3. Sort `env` keys lexicographically.
4. Serialize to Canonical JSON.
5. Compute SHA256.

---

## 3. Finality Conditions

An execution is considered **FINALIZED** if and only if:
1. **Termination**: The process has exited (exit code available) OR a terminal security event was triggered.
2. **Teardown**: The provider has successfully destroyed the runtime environment (no leaked resources).
3. **Auditability**: `mountHash` and `executionHash` have been calculated using the canonical layer.
4. **Immutability**: The resulting envelope is runtime-frozen and cannot be mutated.

---

## 4. Witness Eligibility

Only **FINALIZED** envelopes are eligible for witness signing. Signing a `COMPLETED` but not yet `FINALIZED` envelope is a protocol violation.

---

## 5. Migration & Compatibility

- **Forward Compatibility**: Version 1.x.x must be readable by all future AION witness nodes.
- **Semantic Drift**: Any change to hashing inputs (e.g., adding `workingDir` to `executionHash`) REQUIRES a major version bump.
- **Signature Invalidation**: A version bump invalidates the deterministic equivalence with previous versions.
