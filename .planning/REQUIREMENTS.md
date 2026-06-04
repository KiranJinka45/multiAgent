# Requirements: Milestone v1.8.0 — Trust-Chain Operationalization

**Defined:** 2026-06-03
**Core Value:** Operationalization of the trust-chain by resolving the Rekor PEM submission key issue, implementing attestation evidence flow, and integrating transparency-log validation.

## Active Requirements: Trust-Chain Operationalization

### 1. Rekor PEM Resolution (PEM)
- [x] **PEM-01**: Investigate and resolve PEM encoding issues of Rekor submission keys. Ensure ZTAN can parse and decode standard Rekor PEM public keys correctly without falling back to local-only appends.
- [x] **PEM-02**: Verify that signatures from Rekor-compatible keys can be parsed, decoded, and matched correctly.

### 2. Attestation Evidence Flow (ATT)
- [x] **ATT-01**: Implement the attestation evidence flow ensuring that virtualization-level evidence packets can flow into the main auditor.
- [x] **ATT-02**: Verify that containment and sandbox attestation proofs propagate and validate correctly as part of the overall trust chain.

### 3. Transparency-Log Validation (TLOG)
- [ ] **TLOG-01**: Implement transparency-log verification and validation. Make sure that inclusion proofs can be checked by the ztan-auditor.
- [ ] **TLOG-02**: Ensure that the ztan-auditor can run a local validation of the transparency log.

## Future Requirements (Deferred)
- **DEF-01**: Warning Debt Reduction (backlog of unused variables and implicit `any` types).
- **DEF-02**: Independent verification wave (cross-process, cross-machine, or cross-version trust portability tests).

## Out of Scope
- **OOS-01**: New Architectural Expansion — Core primitives and substrates are frozen.
- **OOS-02**: AI Cognition Expansion — No new cognitive modules or expansion agents.

## Traceability Mapping

| Requirement | Component / Action | Status |
|-------------|--------------------|--------|
| PEM-01 | Phase 5: Rekor PEM Resolution | Complete |
| PEM-02 | Phase 5: Rekor PEM Resolution | Complete |
| ATT-01 | Phase 6: Attestation Evidence Flow | Complete |
| ATT-02 | Phase 6: Attestation Evidence Flow | Complete |
| TLOG-01 | Phase 7: Transparency-Log Validation | Pending |
| TLOG-02 | Phase 7: Transparency-Log Validation | Pending |

---
*Last updated: 2026-06-03 — Milestone v1.8.0 Requirements Initialized*
