# Semantic Treaty Workflow (v1.0 - Simulation Framework)

A **Semantic Treaty** is modeled within this framework as a simulated, rule-based agreement between simulated regional organizational partitions. It defines the mock operational bounds (e.g. latency constraints, consensus tolerances, and shared invariants) under which simulated transactional data exchange may occur.

---

## 1. Simulated Treaty Lifecycle

Within the local simulation, a semantic treaty progresses through four deterministic phases:

```
[1. SIMULATED PROPOSAL] ───► [2. SIMULATED COMPLIANCE] ───► [3. SIMULATED SIGNING] ───► [4. SIMULATED STATUS]
```

### Phase 1: Simulated Proposal
An in-memory actor submits a treaty proposal outlining custom simulated constraints (e.g., maximum network latency, required invariants, consensus drift tolerances). Proposals are structured as standard JSON payloads.

### Phase 2: Simulated Compliance Check
The receiving simulated organization parses the proposal terms and evaluates them against mock system telemetry.
- **Simulated Latency Audit**: Checks if current simulated network round-trip time is within the proposed threshold.
- **Simulated Invariant Audit**: Confirms if the required invariants are successfully resolved and verified in the local translation registry.

### Phase 3: Simulated Cryptographic Signing
If compliance audits pass within the simulation, mock signatures are appended. The signature is a sha256 hash combination of the simulated organization ID, treaty ID, and negotiated terms.

### Phase 4: Active Monitoring (Simulated Status)
The simulation runner continuously monitors mock telemetry against the signed treaty terms. If telemetry degrades (e.g. latency spikes past limits or simulated consensus drifts), the treaty status is marked as `VIOLATED` in the simulation state, triggering simulated quarantine routing rules.

---

## 2. Treaty Schema & Parameters

Custom proposals configure the following simulated properties:

```json
{
  "latencyLimitMs": 150,
  "consensusDriftLimit": 0.05,
  "maxSlashRate": 0.10,
  "requiredInvariants": [
    "MONOTONIC_SEQUENCE",
    "CRYPTOGRAPHIC_LINEAGE"
  ]
}
```

### Parameter Explanations (Simulation Bounds):
- **`latencyLimitMs`**: The maximum acceptable latency (in milliseconds) before the simulated federation is considered degraded.
- **`consensusDriftLimit`**: The maximum allowable desynchronization percentage across simulated epochs.
- **`maxSlashRate`**: The ceiling rate of simulated node slashing allowed within a single epoch under consensus failure.
- **`requiredInvariants`**: The exact array of core semantic concepts that must be fully aligned and validated.

---

## 3. Simulated Cryptographic Verification & Notarization

Every simulated treaty generates a unique **Proof Hash**:
$$\text{Proof Hash} = \text{SHA-256}(\text{remoteOrgId} + \text{termsJson} + \text{timestamp})$$

This immutable hash represents the exact configuration agreed upon within the simulation database. Any modification to the treaty terms results in a different hash, rendering the old agreement void. This models how a distributed federation safeguards against unauthorized or stealth configuration mutations.
