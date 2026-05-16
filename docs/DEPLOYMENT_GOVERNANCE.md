# ZTAN Deployment Governance V1.0 (Pilot Playbook)

## 1. Objective
This document defines the mandatory deployment guardrails for first-party enterprise pilots of the Nexus ZTAN substrate.

## 2. Standard Pilot Configuration (V1.0)
All pilot cells MUST be configured with the following baseline settings to ensure institutional safety.

### 2.1 Environmental Isolation
The following environment variables are MANDATORY:
- `TENANT_ID`: Unique UUID for the enterprise partner.
- `ISOLATION_MODE`: Set to `STRICT` (Enforces gVisor/Firecracker).
- `QUOTA_COMPUTE_CAP`: Max CPU milliseconds per mission (Default: 5000).
- `QUOTA_MEMORY_CAP`: Max memory bytes per mission (Default: 128MB).
- `NETWORK_POLICY`: Set to `ALLOW_INTERNAL_ONLY` (Denies egress to non-whitelisted domains).

### 2.2 Infrastructure Requirements
- **Runtime**: gVisor (runsc) or Firecracker is required for all T1/T2 missions.
- **Database**: Must use Row Level Security (RLS) policies bound to `tenant_id`.
- **Witness**: Must connect to a hardened regional witness server with Merkle logging enabled.

## 3. Deployment Sequence

### 3.1 Pre-Flight Verification
Run the invariant audit before any production mission:
```bash
pnpm exec tsx scripts/verify-invariants.ts
```

### 3.2 Cell Initialization
1. Provision a dedicated namespace/container.
2. Inject the `TENANT_ID` and `CELL_SECRET`.
3. Start the Cell Manager to generate the initial epoch root.

### 3.3 Sanity Check
Execute a "Mission 0" (Observational only) to verify telemetry and isolation integrity.

## 4. Quota Enforcement
The `QuotaManager` will automatically halt missions that exceed the pre-defined `QUOTA_COMPUTE_CAP`. 
- **Graceful Termination**: 500ms for evidence flushing.
- **Hard Kill**: Immediate SIGKILL if grace period exceeded.

## 5. Audit Compliance
Every mission MUST generate a signed evidence dossier. Dossiers lacking a valid `TenantId` or `EpochProof` will be rejected by the Auditor CLI.
