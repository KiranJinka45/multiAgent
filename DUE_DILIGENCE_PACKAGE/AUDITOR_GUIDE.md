# ZTAN Auditor & Verification Guide

This guide instructs external technical auditors on how to execute offline verification of the ZTAN transaction ledger.

## 🌳 Merkle Inclusion Proof Reconstitution
Every ledger transaction hash is etched to the Sigstore Rekor transparency log. To verify that an entry is mathematically included in the public log's Merkle tree:

1. **Reconstruct the Leaf Hash**:
   ```bash
   LeafHash = SHA-256(0x00 || Base64Decode(entry.body))
   ```

2. **Recompute the Root**:
   Locate the sibling hashes in `inclusion-proof.json` and calculate the parent nodes recursively up to the root hash.

3. **Verify the Root Checkpoint**:
   Compare the computed root hash against the expected root hash signed by the Rekor log authority. A match guarantees the history has not been tampered with.

## 🕵️ Causal Lineage DAG Replay
Auditors can verify that an autonomous agent task didn't execute unauthorized side-effects by tracing its causal lineage:

```bash
npx tsx packages/ztanctl/src/index.ts --role auditor diag lineage <taskId>
```
This maps out the entire sequence of ingress checks, policy evaluations, and execution checkpoints to prove full deterministic accountability.
