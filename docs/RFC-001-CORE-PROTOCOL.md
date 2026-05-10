# RFC-001: Core Replay Protocol

**Status**: STABLE (v1.0.0)
**Scope**: Deterministic Execution & Receipt Generation

## 1. Objective
To define a normative protocol for the deterministic replay of institutional workloads across physically separate and heterogeneous witness nodes.

## 2. Execution Environment
- **Runtime**: ZTAN Deterministic Runtime (Firecracker-isolated).
- **Isolation**: All external non-deterministic sources (System Time, Randomness, Network I/O) MUST be intercepted and replaced by the Replay Oracle.
- **Determinism Boundary**: Any operation that violates determinism MUST trigger a `REPLAY_DIVERGENCE` event and halt the witness node.

## 3. Epoch Management
- **Epoch ID**: Monotonically increasing 64-bit integer.
- **Epoch Boundary**: Defined by the Governance Merkle Tree root update.
- **Finality**: An epoch is considered institutionally final when a 2/3 weighted quorum of federated witnesses has signed the `FederatedGovernanceReceipt`.

## 4. Receipt Structure
Every deterministic execution result MUST be anchored in a `GovernanceReceipt`:
- `receiptId`: Unique identifier (UUID v4).
- `epochId`: Reference to the governance epoch.
- `outcomeHash`: SHA-256 hash of the execution state delta.
- `witnessSignatures`: Array of cryptographic signatures from participating institutions.

## 5. Divergence Handling
If a witness node detects a mismatch in the `outcomeHash` compared to the quorum:
1. The node MUST broadcast a `DIVERGENCE_ALERT`.
2. The node MUST enter a `SUSPENDED` state pending forensic audit.
3. The `ArbitrationEngine` MUST generate a `SlashingEvidence` packet if the divergence is found to be Byzantine.

## 6. Backward Compatibility
- All nodes MUST support N-1 major versions of the Core Replay Protocol.
- Protocol versioning is governed by the `StewardshipEngine`.
