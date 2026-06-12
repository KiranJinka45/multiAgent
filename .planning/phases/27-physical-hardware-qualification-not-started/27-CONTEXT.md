# Phase 27: Physical Hardware Qualification - Context

**Gathered:** 2026-06-12
**Status:** Planned & Awaiting Environment Provisioning

<domain>
## Phase Boundary

Execute ZTAN's hardware-dependent validation suites on physical, non-virtualized Linux host hardware with active TPM 2.0 (`/dev/tpm0`) and KVM (`/dev/kvm`) endpoints, retiring all virtualization-related qualifications.

</domain>

<decisions>
## Implementation Decisions

### Environment Requirements
- **D-01:** Host must be a physical non-virtualized machine. `systemd-detect-virt` must return `none`.
- **D-02:** Access to the physical TPM device `/dev/tpm0` and KVM device `/dev/kvm` must be active and verified.

### TPM Execution
- **D-03:** Run native TPM key-generation and PCR quote queries. Retrieve a genuine manufacturer Endorsement Key (EK) certificate and verify the `tpm2_quote` signature.
- **D-04:** Confirm that the attestation mode switches from `SIMULATED` to `PHYSICAL`.

### Firecracker Execution
- **D-05:** Execute the 100-launch microVM endurance loop natively on the host's KVM, capturing launch latency and resource leaks.
- **D-06:** Enforce zero resource leaks (CPU, memory, file descriptors) across the campaign.

### the agent's Discretion
- Choice of physical Linux distribution (Ubuntu, Debian, or RHEL).
- Exact hardware hardware specification (CPU architecture, motherboard TPM module vendor).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Runbooks & Frameworks
- `EVIDENCE_ACCUMULATION_RUNBOOK.md` — Path 3 checks, commands, and success criteria.
- `PHYSICAL_TPM_CERTIFICATION.md` — TPM attestation verification instructions.
- `FIRECRACKER_BARE_METAL_CERTIFICATION.md` — Bare-metal microVM endurance spec.
- `PHYSICAL_HARDWARE_CERTIFICATION.md` — Physical host execution guide.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/validate-physical-hardware.ts` — Script verifying TPM devices and executing PCR quotes.
- `scripts/firecracker-endurance-campaign.ts` — Script managing Firecracker launch-loops and leak checks.
- `packages/runtime-core/src/tpm/quote-generator.ts` — TPM communication primitives.

### Integration Points
- Native hardware dev files (`/dev/tpm0`, `/dev/kvm`).

</code_context>

<deferred>
## Deferred Ideas

- External Pilot Deployment — Out of scope (handled in Phase 25).
- Independent Operator Validation — Out of scope (handled in Phase 26).

</deferred>

---

*Phase: 27-physical-hardware-qualification-not-started*
*Context gathered: 2026-06-12*
