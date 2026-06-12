# Phase 20: Virtualization Boundaries Review - Context

**Gathered:** 2026-07-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish a comprehensive virtualization boundaries review and report, auditing isolation containment across guest, host, KVM, and TPM layers. This review reconciles the WSL2/simulation qualifications from milestone v1.12.0 and details the security posture and isolation limits of the Firecracker runtime environment.

</domain>

<decisions>
## Implementation Decisions

### Scope of the Review Document
- **D-01:** Produce a formal review document at `VIRTUALIZATION_BOUNDARIES_REVIEW.md` in the repository root.
- **D-02:** The document must contain a structured, visual representation of virtualization layers and security boundaries (using standard Mermaid diagramming).
- **D-03:** Document must detail the Guest ↔ Host privilege matrix, mapping resource access types, isolation mechanisms, and privilege escalation mitigations.
- **D-04:** Document must analyze TPM trust boundaries, comparing hardware-based TPM (TPM 2.0) with simulated/virtual TPM quote verification.
- **D-05:** Document must explicitly evaluate WSL2 virtualization qualifications, defining how WSL2/Hyper-V alters the security assumptions of bare-metal executions.
- **D-06:** Document must specify Firecracker microVM isolation mechanisms, seccomp filters, jailer execution modes, and minimal device-model configurations.
- **D-07:** Document must compile a Residual-Risk Register and outline a Qualification-Removal Roadmap to guide transitioning validation toward native bare-metal production hosts.

### Discretionary Details
- The layout, visual design, and specific formatting of the privilege matrix and risk registers.
- Precise diagrams outlining vsock communication channels and TPM attestation structures.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Operational Requirements & Status
- `.planning/REQUIREMENTS.md` — Active v1.13.0 requirements (`OPS-MAINT-POST-02`)
- `.planning/ROADMAP.md` — Milestone timelines and success criteria
- `BARE_METAL_PORTABILITY_VERIFICATION.md` — Legacy WSL2 environment details
- `SECURITY_REVIEW.md` & `THREAT_MODEL.md` — Threat model parameters and privilege containment baselines

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/validate-physical-hardware.ts` — Details how TPM quotes are queried/simulated.
- `scripts/firecracker-endurance-campaign.ts` — Contains runtime invocation parameters for Firecracker microVMs.

### Established Patterns
- Architectural documents and audits are written in GitHub-flavored Markdown in the repository root or `.planning/`.
- Privilege maps follow the conventions used in `SECURITY_REVIEW.md`.

</code_context>

<deferred>
## Deferred Ideas

- Implementation of active seccomp filters enforcement inside the guest microVM image — Out of scope.
- Integration of a physical HSM verification harness — Out of scope for this review phase.

</deferred>

---

*Phase: 20-virtualization-boundaries-review*
*Context gathered: 2026-07-11*
