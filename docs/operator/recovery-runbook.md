# ZTAN Operator Recovery Runbook

This document is intended for "Fresh Operators" assuming control of ZTAN infrastructure during a catastrophic failure. It provides step-by-step procedures to resurrect destroyed cells and rotate governance keys without relying on online infrastructure or the original founders.

## Scenario 1: Full Cell Loss Recovery (Cold Start Resurrection)

If an Execution Cell is completely wiped from memory and disk, it can be resurrected using the offline Trust Registry and the Evidence Packet corpus.

### Prerequisites
1. An offline snapshot of the Trust Registry (`registry_snapshot.json`).
2. A corpus of historical `InstitutionalEvidencePacket` JSON files.

### Recovery Steps
1. **Initialize the offline auditor**
   Provide the trust registry snapshot to the auditor tool to load the trusted Governance Epochs.
   ```bash
   ztan-auditor --registry ./registry_snapshot.json --init
   ```

2. **Reconstruct the Archive**
   Feed the evidence packet corpus into the auditor to rebuild the Merkle Tree.
   ```bash
   ztan-auditor --reconstruct ./evidence_packets/ --verify-root
   ```
   *Success Criteria:* The auditor confirms the reconstructed root hash matches the `lastKnownGovernanceEpoch` stored in the Trust Registry.

3. **Restart the Cell**
   Once verified, provide the snapshot to the cell startup script.
   ```bash
   ztan-cell start --trust-anchor ./registry_snapshot.json
   ```

## Scenario 2: Governance Succession (Stewardship Rotation)

If the original signers are compromised or voluntarily rotating out, the system must transition trust to new keys without breaking historical lineage.

### Prerequisites
1. Access to the current active Trust Registry.
2. The public signatures of the new operator set.

### Rotation Steps
1. **Anchor the New Epoch**
   Use the administrative CLI to declare the new epoch and link it to the current authoritative Merkle root.
   ```bash
   ztan-admin anchor-epoch --epoch-id "epoch-beta" --root <current_root>
   ```

2. **Revoke Retiring Signatures**
   Add the old operators' signatures to the revocation list to prevent them from producing valid future containment or recovery proofs.
   ```bash
   ztan-admin revoke-signature "sig_alpha"
   ztan-admin revoke-signature "sig_beta"
   ```

3. **Export and Distribute**
   Export the updated Trust Registry snapshot and distribute it to all active cells and offline auditors.
   ```bash
   ztan-admin export-registry > ./new_registry_snapshot.json
   ```
   *Success Criteria:* The `ztan-auditor` rejects any new packets signed by `sig_alpha`, but still considers the `epoch-beta` trust root valid.
