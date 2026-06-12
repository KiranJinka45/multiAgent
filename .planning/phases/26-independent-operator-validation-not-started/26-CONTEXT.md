# Phase 26: Independent Operator Validation - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Demonstrate that an independent human operator can successfully deploy, operate, and verify the ZTAN control plane without author intervention or prior repository state.

</domain>

<decisions>
## Implementation Decisions

### Operator Profile
- **D-01:** The operator must not be a repository author, contributor, or associated with the project development team.

### Environment & Access
- **D-02:** Provision a fresh machine (clean VM, cloud instance, or separate workstation) with no prior repository state or cached packages.
- **D-03:** The operator will clone the repository using read-only access (no write access permitted to the repository).

### Support Limits
- **D-04:** Zero author assistance during setup, execution, and verification. The operator must follow only the provided documentation.

### Verification Kit Execution
- **D-05:** Operator must run all verify-kit stages end-to-end (Node build, smoke tests, Python vector generation, and offline auditor verification).

### the agent's Discretion
- Choice of operator and fresh test environment.
- Format of the operator's attestation verification signature.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Guides & Runbooks
- `EVIDENCE_ACCUMULATION_RUNBOOK.md` — Path 2 checklists, operator instructions, and exit criteria.
- `DUE_DILIGENCE_PACKAGE/OPERATOR_GUIDE.md` — Verification run guide for operators.
- `DUE_DILIGENCE_PACKAGE/AUDITOR_GUIDE.md` — Auditor verification instructions.
- `GETTING_STARTED_OPERATORS.md` — Setup instructions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `verify-kit/` — Portable python-based verification tools (`verify.py`, `auditor.py`).
- `verify-kit/v1.5/generate-vectors.mjs` — JS-based vector generator.
- `scripts/run-smoke-tests.js` — System-level smoke testing.

### Integration Points
- Read-only public clone URL.

</code_context>

<deferred>
## Deferred Ideas

- External Pilot Deployment — Out of scope (handled in Phase 25).
- Physical Hardware Qualification — Out of scope (handled in Phase 27).

</deferred>

---

*Phase: 26-independent-operator-validation-not-started*
*Context gathered: 2026-06-12*
