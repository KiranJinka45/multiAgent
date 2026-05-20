# Architecture Review Window

## Constitutional Rule
The ZTAN Governance Console and underlying stewardship mechanisms are frozen. To prevent emotional redesigns, feature creep, and silent operational entropy, changes are restricted by the following procedural window.

## The Cadence
1. **Annual Review Only:** The architecture is formally evaluated once per year. Ad-hoc redesigns are strictly prohibited.
2. **Emergency Vulnerabilities:** Security patches bypassing the window must be narrowly scoped to CVE remediation with zero functional footprint change.

## RFC Requirements for Change
Any proposal to alter the `FROZEN_SURFACE_AREA.md` must be submitted as a formal Governance RFC containing:
1. **Operational Evidence:** Hard data proving the current limitation causes measurable SRE toil or cognitive failure.
2. **Benchmark Regressions:** Proof that the proposed change does not bloat bundle sizes ($>500\text{KB}$), increase memory footprint, or reduce TTI (Time to Interactive).
3. **Subtractive Engineering Proof:** If adding complexity, an equivalent amount of complexity must be removed to maintain zero net-entropy.
4. **No Speculative Justification:** Future-proofing or "industry trends" are not valid reasons for architectural modification.
