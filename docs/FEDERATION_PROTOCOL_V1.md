# 🛡️ FEDERATION_PROTOCOL_V1

**Version**: 1.0.0  
**Status**: FROZEN  
**Mandate**: This document defines the constitutional rules for distributed institutional reconciliation. No node may join the federation without adhering to these semantics.

---

## 1. Witness Identity Model

A Witness is an independently governed node capable of attesting to institutional truth.

### 1.1 Identity Specification
- **`witnessId`**: A unique, non-repudiable identifier (derived from Public Key).
- **`publicKey`**: RSA-PSS (2048-bit minimum) or Ed25519.
- **`trustScope`**: Defines the mission categories the witness is authorized to sign.
- **`attestation`**: A self-signed metadata descriptor containing operational SLOs and security posture.

### 1.2 Key Rotation & Revocation
- **Monotonicity**: New keys must sign the previous key's revocation notice.
- **Institutional Slashing**: Any witness that signs two different roots for the same epoch (equivocation) is subject to immediate institutional exclusion.

---

## 2. Epoch Exchange Contract

Federation occurs exclusively at the **Epoch** level. No partial execution state is ever federated.

### 2.1 Exchange Descriptor
```json
{
  "protocol": "ZFP/1.0",
  "sender": "witness_abc_123",
  "epoch": {
    "epochId": 12,
    "rootHash": "...",
    "prevRootHash": "...",
    "envelopeRange": { "start": 100, "end": 120 },
    "signature": "..."
  }
}
```

### 2.2 Synchronization Rules
- **Monotonic Sequence**: Epochs must be received and processed in sequential order.
- **Lineage Integrity**: `epoch.prevRootHash` MUST match the local `RootLedger.latestEpoch.rootHash`.
- **Range Continuity**: `epoch.envelopeRange.start` MUST be exactly `lastLocalEpoch.envelopeRange.end + 1`.

---

## 3. Reconciliation Semantics

### 3.1 Conflict Resolution
- **Equivocation Detection**: If a node receives two different `rootHash` values for the same `epochId` from different witnesses, the institutional truth is considered **FORKED**.
- **Consensus Requirement**: (Future Phase) Reconciliation requires a quorum of signatures from the authorized witness set.
- **Drift Handling**: Timestamp drift is allowed within a defined window (e.g., 60 seconds), but is subordinate to the Merkle lineage.

### 3.2 Out-of-Order Checkpoints
- **Buffer Zone**: Nodes may buffer out-of-order epochs, but cannot commit them to the `RootLedger` until the lineage gap is filled.
- **Gap Discovery**: Nodes missing an intermediate epoch must trigger a **Lineage Recovery Request**.

---

## 4. Federation Invariants

1. **Finality First**: Only `FINALIZED` execution envelopes may enter the Merkle tree.
2. **Epoch Isolation**: Epochs are atomic; partial epoch synchronization is forbidden.
3. **Determinism Dominance**: Replay outcomes MUST be identical across all federation nodes.

---

## 5. Security Policy

- **Anti-Equivocation**: A witness signature is an irrevocable commitment to a specific Merkle root.
- **Verification Priority**: Lineage integrity (prevRootHash) is verified BEFORE signature validation to prevent DoS attacks with validly-signed but invalidly-chained epochs.
