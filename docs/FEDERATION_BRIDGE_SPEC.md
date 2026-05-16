# Multi-Federation Bridge Protocol Spec (v1.0)

## 1. Objective
Enable independent ZTAN federations to cryptographically attest to each other's state, allowing for secure mission portability and cross-institutional governance verification.

## 2. Trust Model: Federated Sovereignty
- **No Global Root**: There is no single "Master Federation."
- **Peer-to-Peer Peering**: Federations opt-in to trust peer federations by exchanging **Governance Root Anchors**.
- **Isolation Boundaries**: A breach in Federation A does not compromise the Merkle integrity of Federation B, provided the bridge validator rejects invalid root transitions.

## 3. The Federation Handshake
To link two federations, an administrative handshake must occur:

1.  **Identity Exchange**: Both federations exchange public keys (Auditor identities).
2.  **Root Anchor Initialization**: Federation A provides its latest **Governance Merkle Root** (GMR) and Lineage Proof to Federation B.
3.  **Mutual Attestation**: Both federations sign a "Bridge Establishment Certificate."

## 4. Cross-Federation Evidence Verification
When a mission is "bridged" from Federation Alpha to Federation Beta:

1.  **Inclusion Proof**: Alpha provides a Merkle inclusion proof for the mission.
2.  **Lineage Proof**: Alpha provides a consistency proof linking the mission's root to the anchored GMR stored in Beta.
3.  **Signature Verification**: Beta verifies the attestation signature using Alpha's public key.

## 5. Slashing & Revocation
If a bridged federation is detected to have undergone **lineage equivocation** (double-signing different roots for the same epoch), the bridge must be immediately **severed** and all bridged missions marked as "UNTRUSTED."

---
*Status: Draft V1.0 - ZTAN V2.0 Foundation*
