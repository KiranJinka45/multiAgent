# Nexus ZTAN: Recovery Playbook (v2026.LTS.1)

## Objective
Restore the Nexus ZTAN platform to a "Known Good" institutional state within 30 minutes of a confirmed corruption or failure.

---

## 🏎️ Phase 1: One-Command Recovery (OCR)

In the event of system-wide failure, use the unified `ztanctl` interface to initiate the recovery protocol.

### Command
```bash
ztanctl recovery execute --role sre
```

### What happens behind the scenes:
1. **Invariant Audit**: The system scans `packages/ztan-crypto` for Trust Epoch alignment.
2. **State Purge**: Corrupted ESM bundles and transient `.next` artifacts are purged.
3. **Seed Restoration**: Recovery anchors are fetched from the `ZTAN_KMS_SALT` derivations.
4. **Resurrection**: Services are restarted in topological order (Auth -> DB -> Core API -> Gateway).

---

## 🎮 Phase 2: Survivability Drills

Institutional stability is maintained through proactive rehearsals. SREs must perform at least one drill per trust epoch.

### Command
```bash
ztanctl recovery drill <scenario> --role sre
```

### Scenarios:
- `corruption`: Simulates a tampered ESM bundle.
- `rotation`: Rehearses a Trust Epoch transition.
- `breach`: Simulates an identity compromise and forces immediate revocation.

---

## 🔍 Phase 3: Post-Recovery Verification

After any recovery or drill, finality must be verified to ensure no state drift.

### Command
```bash
ztanctl recovery verify --role auditor
```

### Verification Checklist:
- [ ] **Consensus Root**: Ensure all nodes agree on the current Trust Epoch.
- [ ] **Patch Provenance**: Verify that all active code patches have valid `PatchIntent` signatures.
- [ ] **Identity Health**: Check that `did:ztan` identities are valid and certified.

---

## 🆘 Emergency Governance (Break-Glass)

In extreme scenarios where M-of-N governance is deadlocked (e.g., quorum unavailability during an outage), an **Emergency Break-Glass Override** is permitted.

### Procedure:
1. **Initiation**: `ztanctl governance override --reason "..." --scope <SCOPE>`
2. **Scopes**:
   - `RECOVERY_ONLY`: Allows restoration from anchor.
   - `PATCH_ONLY`: Allows urgent hotfix deployment.
   - `EMERGENCY_ROTATION`: Orchestrates immediate epoch shift.
3. **Approval**: Hardware-bound signature (TPM/HSM) required.
4. **Audit**: Logged in `GovernanceLedger` with a high-severity alert.
5. **Reconciliation**: Mandatory retrospective quorum review required within 24h to certify the override and resume standard governance.

---

## 📐 State Normalization & Replay Stability

To ensure **Multi-Year Determinism**, recovery snapshots and governance ledgers adhere to strict normalization and versioning rules:

### Normalization Safety
- **Stripped (Incidental)**: `timestamp`, `ephemeralId`, `internalMetrics`.
- **Preserved (Semantic)**: `replicationLag`, `consensusVersion`, `policyRevisionId`.
- **Ordering**: Recursive lexicographical key sorting.

### Replay Integrity
- **Versioning**: Every ledger entry binds a `schemaVersion` and `replayEngineVersion`.
- **Compaction**: `GovernanceSnapshots` provide signed, high-integrity checkpoints.
- **Future Equivalence**: Snapshots embed `schema`, `engine`, and `canonicalization` versions to ensure long-term self-describing reproducibility.
- **Stability Policy**: **5 years of backward compatibility** for all governance schemas.

### Institutional Continuity
- **Memory Loss Resilience**: The platform is certified to survive the complete disappearance of its creators; all state is reconstructible from genesis anchors + ledgers.
- **Cognitive Hygiene**: Mandatory conceptual subtraction ensures the institutional grammar remains beneath the threshold of human cognitive fatigue.
- **Explainability Invariant**: The total recovery narrative must remain < 10 pages to ensure survivability under extreme operational stress.

## 📊 Institutional Core 22 Telemetry

The platform emits exactly 22 operational KPIs. All other telemetry is pruned to reduce cognitive entropy:

| Domain | Core KPIs |
| --- | --- |
| **Determinism** | `replay_equality_rate`, `hash_collision_events`, `canonicalization_divergence` |
| **Governance** | `approval_latency`, `intent_expiration_rate`, `break_glass_frequency`, `quorum_participation` |
| **Continuity** | `ledger_depth`, `snapshot_integrity_rate`, `recovery_drill_success` |
| **Infrastructure** | `node_isolation_events`, `drift_magnitude`, `reconstruction_latency` |
| **Authority** | `identity_verification_rate`, `did_rotation_events`, `cert_expiration_lead_time` |
| **Metabolic** | `subtraction_to_addition_ratio`, `concept_density_index`, `command_surface_entropy` |

---

## 📟 Bounded Cognition Constraints
To ensure survivability across long time horizons, the platform enforces the following limits:
1. **Total Trust Concepts**: < 12
2. **Public Commands**: < 25
3. **Narrative Complexity**: < 10 pages (This document)
4. **Branching Depth**: Max 2 levels for all operational workflows.

---

## 🆘 Troubleshooting

| Issue | Action |
| --- | --- |
| Signature Mismatch | Run `ztanctl governance rotate secrets` to re-sync keys. |
| Epoch Stale | Verify `TRUST_EPOCH` environment variable matches global consensus. |
| Quorum Deadlock | Execute **Emergency Break-Glass** (See above). |
| PDK Failure | Generate a fresh Deployment Kit with `ztanctl infra pdk`. |
