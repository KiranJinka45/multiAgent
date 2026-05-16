# Enterprise Onboarding Checklist (V1.0)

## Phase 1: Preparation
- [ ] Select Institutional Deployment Profile.
- [ ] Assign Operational Roles (Operator, Auditor).
- [ ] Verify System Dependencies (NodeNext, ESM, Snyk).

## Phase 2: Deployment
- [ ] Run `ztanctl deploy init`.
- [ ] Perform `ztanctl deploy validate`.
- [ ] Resolve any preflight failures.

## Phase 3: Governance Activation
- [ ] Run `ztanctl deploy certify`.
- [ ] Verify `ztanctl governance summary` is OPTIMAL.
- [ ] Confirm `ztanctl audit lineage` matches expectations.

## Phase 4: Verification
- [ ] Run a `Shadow Capture` simulation.
- [ ] Verify operator comprehension of the containment narrative.
- [ ] Export an Audit Evidence Pack for third-party review.
