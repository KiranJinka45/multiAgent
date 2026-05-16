# ZTAN Real-World Pilot Operations

This document defines the operational standards for institutional pilots within the ZTAN 2026-LTS.1 release train.

## Pilot Lifecycle Management

Pilots transition through distinct stages, tracked via the `PilotLifecycleManager`:

1. **PROVISIONING**: Initial setup and hardware attestation.
2. **ACTIVE**: Production execution of governed workloads.
3. **HIBERNATING**: State preserved but execution paused.
4. **COMPLETED**: Final state archiving and resource decommissioning.

## Deployment Profiles

Standardized archetypes for various institutional sectors:

| Profile | Retention | Compliance | Witness Quorum |
| :--- | :--- | :--- | :--- |
| Sovereign Government | Permanent | Regulated Sovereign | Strict Majority |
| Healthcare Regulated | 7 Years | HIPAA/GDPR | Weighted Institutional |
| Fintech Tier-1 | 10 Years | PCI-DSS/SOC2 | Consensus Strict |
| University Research | Project Duration | Academic Integrity | Pluralistic Majority |
| Airgapped Defense | Perpetual | MIL-SPEC 810 | Unanimous Local |

## Operational Commands

- `ztanctl pilot register --name "GovAlpha" --type SOVEREIGN`: Provision a new pilot.
- `ztanctl pilot lifecycle --id GovAlpha`: Inspect historical transitions and Merkle-linked audit trails.
