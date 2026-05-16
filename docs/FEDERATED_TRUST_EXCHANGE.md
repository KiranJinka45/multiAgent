# Federated Trust Exchange (V1.0)

## 1. Trust Interoperability
The ZTAN Federated Trust Exchange (FTX) enables multiple independent organizations to exchange verifiable proofs of governance continuity. This creates a network effect where trust in one institution's history can be utilized by another without creator mediation.

## 2. The Continuity Attestation
An attestation is a signed bundle of longitudinal metrics:
- **Org ID**: The unique identifier for the institution.
- **Trust Days**: Days of continuous, drift-free operation.
- **Stability Index**: Composite score of governance consistency.
- **Lineage Hash**: Cryptographic anchor for the current governance state.

## 3. Cross-Org Verification Workflow
1. **Request Attestation**: Obtain the `TrustAttestation` from the target federation.
2. **Verify Provenance**: Verify the anchor signature against the Global Trust Root.
3. **Forensic Replay**: (Optional) Request a limited lineage history and perform an independent replay using `ztanctl federation verify`.
4. **Reputation Update**: Incorporate the verified attestation into the local federated reputation layer.
