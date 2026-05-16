# Architecture

**Analysis Date:** 2026-05-10

## High-Level Pattern: Governed Autonomous Cluster

The system follows a "Control Plane / Worker" architecture with a dedicated "Governance / Audit" layer (ZTAN).

### 1. Control Plane (`apps/control-plane`)
The "brain" of the system. It handles:
- Mission planning and decomposition (DAG generation).
- Agent assignment and tracking.
- Global state management via Etcd.

### 2. Execution Layer (`apps/worker`)
The "hands" of the system.
- Executes `MissionSteps` in isolated `sandboxes`.
- Reports telemetry back to the control plane.
- Implements idempotency to ensure safety under network failure.

### 3. ZTAN Governance Layer (ZTAN)
The "conscience" and "memory" of the system.
- **Witness Server**: Cryptographically signs all operational state transitions.
- **Auditor**: Independent Rust-based service that verifies proofs against the "Constitution."
- **Transparency**: Uses Merkle trees to provide a non-repudiable audit trail.

## Core Architectural Principles

- **Survivability**: The system is designed to survive regional failures and network partitions (using Raft and multi-region Redis).
- **Determinism**: Replayability is a first-class citizen. Operations are recorded and must be reproducible for audit.
- **Bounded Autonomy**: Agents operate within a "Safety Envelope" defined by the Constitution and enforced by hard-gated logic.
- **Multi-Tenancy**: Data and execution isolation are enforced at the DB and messaging layers.

## Data Flow

1. **Mission Request**: User or Trigger -> Core API -> Control Plane.
2. **Decomposition**: Control Plane -> DAG of MissionSteps.
3. **Execution**: Control Plane -> Queue -> Worker -> Sandbox.
4. **Validation**: Worker -> ZTAN Witness -> Audit Trail -> Control Plane.
5. **Convergence**: Anti-entropy loops continuously sync state between regions.

## Component Map

- **Brain**: `packages/brain`, `packages/ai`
- **Body**: `apps/worker`, `packages/sandbox`, `packages/runtime`
- **Memory**: `packages/db`, `packages/memory-*`
- **Security**: `packages/ztan-*`, `packages/auth-internal`

---

*Architecture analysis: 2026-05-10*
