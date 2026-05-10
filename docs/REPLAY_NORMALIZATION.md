# ZTAN Replay Normalization Registry

This document formally defines the semantic boundary between deterministic execution behavior and volatile runtime metadata.

## 1. Normalization Taxonomy

Replay verification classifies every field in an `IMissionEvent` into one of three categories:

| Category | Action | Description |
| :--- | :--- | :--- |
| **DETERMINISTIC** | **STRICT MATCH** | Fields that must be bit-identical for a replay to be considered valid. |
| **VOLATILE** | **STRIP / IGNORE** | Fields that are known to vary across runs (entropy, clock drift) and must be ignored. |
| **SEMANTIC_METADATA** | **LOG WARNING** | Fields that should match but may differ due to platform-specific optimizations. |

---

## 2. Field Classifications

### 2.1 Core Event Fields

| Field | Category | Reason for Classification |
| :--- | :--- | :--- |
| `id` | VOLATILE | Auto-generated UUIDs/IDs often rely on local entropy. |
| `missionId` | DETERMINISTIC | Core identity of the trace. |
| `type` | DETERMINISTIC | Event type defines the state machine transition. |
| `timestamp` | VOLATILE | Wall-clock time drift is inevitable across replay environments. |
| `payload` | DETERMINISTIC | The "meat" of the operation. Must be semantically equivalent. |
| `previousHash` | DETERMINISTIC | Linkage integrity for the forensic chain. |
| `eventHash` | DETERMINISTIC | Payload integrity for the forensic chain. |

### 2.2 Standard Payload Fields

| Payload Path | Category | Reason for Classification |
| :--- | :--- | :--- |
| `agentId` | VOLATILE | Agent names may vary in ephemeral testing environments. |
| `stepIndex` | DETERMINISTIC | Logic sequence must be identical. |
| `reproducible` | DETERMINISTIC | Explicit intent of the event. |
| `retryCount` | DETERMINISTIC | **CRITICAL**: Differing retries indicate non-deterministic behavior. |
| `executionDuration`| VOLATILE | I/O latency and CPU scheduling are non-deterministic. |

---

## 3. Normalization Rules

The `replay-verify.ts` tool implements the following transformations before comparison:

1.  **Strip Volatile Roots**: Remove `id` and `timestamp` from the event root.
2.  **Strip Volatile Metadata**: Remove `agentId` from the `metadata` object.
3.  **Payload Scrubbing**: Remove `executionDuration` and `ephemeralToken` from the `payload`.
4.  **Canonical JSON**: Re-serialize the scrubbed objects to ensure property order doesn't trigger false divergences.

---

## 4. Divergence Handling

- **DETERMINISTIC Mismatch**: Triggers `REPLAY_DIVERGENCE` (FATAL).
- **SEMANTIC_METADATA Mismatch**: Triggers `REPLAY_WARNING` (NON-FATAL).
- **VOLATILE Mismatch**: Ignored silently.
