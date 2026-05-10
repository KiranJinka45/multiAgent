# ZTAN Institutional Reproduction Guide

Objective: This guide enables a third party to independently reconstruct the ZTAN institutional state and verify its constitutional legitimacy using only historical archives and the canonical specification.

## 1. Prerequisites for Independent Audit
To perform a clean-room reproduction, you require:
1.  **The Genesis Artifact**: The starting entropy and witness configuration.
2.  **The Governance Log**: A complete sequence of Merkle-anchored, signed receipts.
3.  **The State Matrix**: The authoritative transition topology (`formal/STATE_MATRIX.json`).
4.  **The Reference Interpreter**: Any implementation compliant with the Safety Specification.

## 2. Reproduction Workflow

### Step 1: Bootstrap from Genesis
Initialize your local state with the Genesis witness set and epoch 0.
- Verify the Genesis signature.
- Confirm the Genesis entropy source (Physical Reality Anchor).

### Step 2: Replay the Governance Lineage
Iterate through the Governance Log sequentially. For each receipt:
1.  **Merkle Verification**: Prove inclusion in the governance history.
2.  **Signature Validation**: Confirm quorum thresholds based on the active council.
3.  **Legality Interpretation**: Match the action against the `STATE_MATRIX.json` transition rules.
4.  **Temporal Check**: Ensure no challenge windows were violated.

### Step 3: Certify Institutional Truth
After the final receipt is processed, compare your resulting state (Council, Auditors, Epoch) with the published **Rosetta Stone Corpus**.
- Identical state indicates a **Successful Institutional Reproduction**.

## 3. Success Criteria
A reproduction is considered legitimate ONLY if it results in a bit-for-bit match of the institutional state without reliance on implementation-specific artifacts or memory.

> **Mandate**: This guide must remain readable and executable even if the original implementation environment (e.g., Node.js) is no longer available.
