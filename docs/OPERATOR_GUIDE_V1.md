# ZTAN Operator Guide V1.0 (The Succession Manual)

## 1. Introduction
This guide is for the **Institutional Operator**. It defines the procedures for maintaining the ZTAN substrate after the departure of the original creators (The Founders).

## 2. Core Operations

### 2.1 Starting a Sovereign Cell
- Ensure `CELL_ID` and `CELL_REGION` are defined in the environment.
- Run the cell manager to generate local identity:
  ```bash
  pnpm exec tsx packages/core-engine/src/cell-manager.ts
  ```

### 2.2 Finalizing a Mission
- Missions are finalized via the `MissionOrchestrator`.
- Every mission MUST produce a `.evidence.json` dossier in the `/evidence/` vault.

## 3. Disaster Recovery (The Resurrection Drill)

### 3.1 Regional Recovery
If a cell's runtime state is lost:
1. Restore the `cell-identity.json` (Private Keys) from cold storage.
2. Restore the latest `GovernanceEpoch` root from the Trust Bridge.
3. Run the resurrection script:
   ```bash
   pnpm exec tsx scripts/cell-resurrection.ts
   ```

### 3.2 Audit Reconstruction
If the database is lost, but the dossier vault is intact:
1. Use the ZTAN Auditor CLI to rebuild the truth:
   ```bash
   pnpm exec ztan-auditor rebuild /path/to/evidence/vault
   ```
2. Compare the reconstructed root against the signed root in the latest Epoch.

## 4. Governance Succession

### 4.1 Rotating Stewards
When operators change, you MUST rotate stewardship:
1. Prepare the new set of Public Keys.
2. Trigger the rotation via the `EpochManager`:
   ```bash
   pnpm exec tsx scripts/rotate-stewards.ts --keys pub1,pub2
   ```
3. This will anchor a new Epoch and revoke all previous operator rights.

## 5. Maintenance Checklist
- **Weekly:** Run `scripts/verify-invariants.ts` to detect configuration drift.
- **Monthly:** Run `scripts/certify-baseline.ts` to ensure performance stability.
- **Per Epoch:** Verify Merkle continuity using the `ztan-auditor`.

## 6. Philosophy: Boringly Reliable
If a procedure is not in this manual, it is not an institutional operation. ZTAN is designed to be **predictable**, not adaptive.
