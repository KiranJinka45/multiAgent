# ZTAN Protocol Specification V1.0 (The Institutional Contract)

## 1. Introduction
The ZTAN Protocol defines the rules for **Governed Autonomous Execution**. It is designed to produce a "Boringly Reliable," time-survivable, and cryptographically verifiable forensic record of operations.

## 2. Institutional Evidence Packets
Every mission execution MUST produce an `InstitutionalEvidencePacket`.

### 2.1 Schema (V1)
- `version`: Protocol version (MUST be "1.0").
- `missionId`: Unique identifier for the execution context.
- `tier`: Governance classification (T0–T4).
- `provenance`: 
    - `cellId`: Regional execution cell identifier.
    - `keyVersion`: Version of the signing key.
    - `epochId`: Institutional governance epoch ID.
- `blastRadius`:
    - `actualMutations`: Verified list of file changes.
    - `isCompliant`: Boolean flag for manifest adherence.
- `auditHash`: SHA-256 hash of all execution artifacts.
- `signature`: RSA-2048 signature of the `auditHash`.

### 2.2 Replay Invariant
The `auditHash` MUST be deterministic. Any re-execution within the same `sandbox` boundary using the same `manifest` MUST yield an identical `auditHash`.

## 3. Governance Epochs
Trust is anchored to **Temporal Governance Epochs**.

### 3.1 Epoch Transitions
- Transitions occur upon stewardship rotation or system-wide policy shifts.
- Each epoch has a unique `governanceRoot` (Merkle Root of all prior evidence).
- Epoch continuity is enforced via monotonic `epochId` increments.

### 3.2 Stewardship
- A list of `stewards` (Public Keys) defines the authorized operator set for an epoch.
- Stewardship rotation MUST trigger an epoch transition.

## 4. Blast Radius Boundaries
- **Single Package Root:** Mutations are strictly restricted to the declared package.
- **No Path Traversal:** Accessing `../` or absolute system paths is prohibited.
- **Deterministic Rollback:** T2/T3 missions MUST provide a `rollbackProof` (verification that the mutation can be inverted).

## 5. Regional Sovereignty
- Execution Cells are sovereign.
- Local execution is authoritative even if the global federation is offline.
- Trust federation is a background "Truth Enhancement," not a runtime dependency.

## 6. Audit Reconstruction
Institutional truth is reconstructable from raw dossiers. The `Governance Merkle Tree` can be rebuilt from a corpus of `InstitutionalEvidencePacket` files without requiring live database access.
