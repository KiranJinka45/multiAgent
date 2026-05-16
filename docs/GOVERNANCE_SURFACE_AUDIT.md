# Governance Surface Audit: Nexus ZTAN

## 1. Objective
To identify and prune redundant governance artifacts and evidence fields that contribute to operational complexity without materially increasing institutional trust.

## 2. Current Complexity Status
- **Governance Surface Area (Complexity Factor):** ~1.25 (Baseline)
- **Primary Complexity Drivers:**
    - Deep Merkle lineage proofs in every packet.
    - Redundant isolation signatures (Cell-level vs. Runtime-level).
    - Dense `BlastRadius` manifests for trivial read-only missions.

## 3. Pruning Roadmap (Compression Strategy)

### Phase 1: Metadata Deduping (Immediate)
- **Status:** Recommended
- **Action:** Prune `InstitutionalEvidencePacket.attestation.providerSignature` if the Witness Federation has already signed the `auditHash`. The cell signature implies a valid runtime environment.
- **Estimated Compression:** 15% reduction in packet size.

### Phase 2: Evidence Tiering (Near-term)
- **Status:** Planned
- **Action:** Introduce "Lean Evidence" for T1/T2 missions. For low-blast-radius actions, aggregate Merkle proofs instead of including full inclusion paths in every mission receipt.
- **Estimated Compression:** 40% reduction in storage overhead for high-frequency low-risk missions.

### Phase 3: Forensic Cold Storage (Long-term)
- **Status:** Strategic
- **Action:** Archive full lineage proofs into "Epoch Witnesses." Individual missions only carry a pointer to the Epoch Root + a 1-level inclusion proof.
- **Estimated Compression:** 70% reduction in long-term governance surface.

## 4. Conclusion
By implementing these compression strategies, ZTAN transitions from a "Maximalist Trust" architecture to an "Optimal Governance" institution, reducing the cognitive and operational load on enterprise SRE teams.
