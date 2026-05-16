# ZTAN Guided Recovery Playbook

Operational survivability depends on "boring" and predictable recovery sequences.

## Incident Archive

The `IncidentArchive` preserves every security breach and operational failure.

- **Forensic Bundle**: Complete snapshot of system state at T-incident.
- **Remediation Timeline**: Historical record of every operator action taken during recovery.

## Recovery Engine

The `GuidedRecoveryEngine` provides safe, step-by-step guidance.

### Standard Recovery Sequence
1. **Detection**: Incident recorded in `IncidentArchive`.
2. **Diagnosis**: Run `ztanctl support diagnose`.
3. **Guidance**: Run `ztanctl ops recovery --id <INCIDENT_ID>`.
4. **Execution**: Follow the step-by-step prompts.
5. **Verification**: Close the incident and recalculate the survivability score.

## Commands

- `ztanctl ops incident --id INC-123`: View forensic details.
- `ztanctl ops recovery --id INC-123`: Start the guided recovery assistant.
