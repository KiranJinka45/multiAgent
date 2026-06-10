# Phase 21: Physical TPM Attestation Certification - Context

**Gathered:** 2026-07-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Certify physical TPM attestation on a confirmed non-virtualized Linux host. This phase addresses the qualification on OPS-MAINT-PHYS-01 (Phase 13, v1.12.0) where TPM quote verification was performed using a software mock under WSL2 rather than a hardware TPM 2.0 module.

</domain>

<decisions>
## Implementation Decisions

### Host Requirements
- **D-01:** Host OS must be a confirmed physical non-virtualized Ubuntu, RHEL, or Debian install, verified via `systemd-detect-virt`, `dmidecode`, and `lscpu`.
- **D-02:** `/dev/tpm0` must exist and be accessible to the executing user.

### Attestation Operations
- **D-03:** TPM Endorsement Key (EK) chain must be extracted and validated against the manufacturer Certificate Authority.
- **D-04:** A TPM quote must be generated using `tpm2_quote` with a fresh nonce.
- **D-05:** The generated quote must be verified by the auditor using the public Attestation Identity Key (AIK).

### Evidence Artifacts
- **D-06:** Produce `PHYSICAL_TPM_CERTIFICATION.md` documenting the host environment, TPM details, and verification steps.
- **D-07:** Produce `physical-attestation-evidence.json` containing structured attestation output (PCR values, quote signature, nonce, EK certificate chain).

### Discretionary
- Specific PCR bank selection (SHA-1 vs SHA-256).
- Format of host environment diagnostic output.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — `QUAL-REMOVE-TPM-01`
- `VIRTUALIZATION_BOUNDARIES_REVIEW.md` — Section 4: TPM Trust-Boundary Analysis
- `scripts/validate-physical-hardware.ts` — Existing TPM validation script (currently uses simulated quotes)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/validate-physical-hardware.ts` — Contains the attestation flow; needs modification to call real `tpm2-tools` commands instead of software mocks.

### Established Patterns
- Attestation evidence is written as structured JSON to the repository root or `evidence/` directory.

### Integration Points
- The auditor-rs crate validates attestation signatures; it will need the real AIK public key.

</code_context>

<deferred>
## Deferred Ideas

- Remote attestation via a Trusted Service Provider (TSP) — Out of scope for this phase.
- PCR policy binding for sealed secrets — Out of scope.

</deferred>

---

*Phase: 21-physical-tpm-attestation*
*Context gathered: 2026-07-11*
