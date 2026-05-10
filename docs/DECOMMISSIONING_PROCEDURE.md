# ZTAN Decommissioning & Graceful Sunset Procedure 🛡️

**Objective**: To ensure a cryptographically final and non-chaotic shutdown of the institutional substrate.

## 1. Trigger Conditions
- **Constitutional Dissolution**: 80% super-quorum of federated institutions vote to retire the substrate.
- **Unsurvivable Fragmentation**: Irreconcilable divergence resulting in <3 nodes capable of maintaining the shared lineage.
- **Stewardship Exhaustion**: Documentation of zero active stewardship participation for >180 days.

## 2. Decommissioning Lifecycle
### Phase A: Archival Seal
- **Action**: Halt all new missions and state transitions.
- **Action**: Generate the **Final Cryptographic Snapshot** of the state root.
- **Action**: Anchor the Final Snapshot Hash in an independent immutable store (e.g., L1 blockchain or public ledger).

### Phase B: Federated Evidence Retention
- **Action**: Each operator performs a final **Forensic Replay** to confirm the integrity of the total lineage.
- **Action**: All [**`FederatedGovernanceReceipts`**](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/federation.ts) and [**`MinorityAnnotations`**](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/history.ts) are packaged into an air-gapped forensic archive.

### Phase C: System Sunset
- **Action**: Dissolve the Stewardship Board.
- **Action**: Power down nodes.
- **Action**: Cryptographically seal the private keys used for attestation.

## 3. Post-Sunset Visibility
The [**`PILOT_LESSONS_ARCHIVE.md`**](file:///c:/multiagentic_project/multiAgent-main/docs/PILOT_LESSONS_ARCHIVE.md) and final lineage metadata must remain publicly accessible to serve as an institutional record.
