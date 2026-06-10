# ZTAN Security Posture Review (Phase 17)

This security posture review evaluates the containment boundaries, bypass paths, and cryptographic integrity of the Zero Trust Access Network (ZTAN) codebase.

---

## 1. Mock Bypass Paths
*   **Code Reference**: 
    - [packages/utils/src/server.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/server.ts#L424-L473) (`MOCK_REDIS`)
    - [scripts/validate-physical-hardware.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/validate-physical-hardware.ts#L241-L242) (`ZTAN_MOCK_TPM`)
    - [packages/governance-core/src/isolation/physical-firecracker.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/isolation/physical-firecracker.ts#L74) (`disableFallback`)
*   **Evaluation**:
    - **Redis Mocking**: Setting `MOCK_REDIS=true` replaces the active Redis Sentinel cluster client with a simple, in-memory Map structure. In production, this bypasses the consensus layer, disabling lease fencing.
    - **TPM Mocking**: If `ZTAN_MOCK_TPM=true`, the platform bypasses the hardware TPM 2.0 interface `/dev/tpm0` and utilizes the software-simulated `TPMQuoteGenerator`.
    - **Container Fallback**: If the hypervisor checks fail, the adapter automatically falls back to containerization unless `disableFallback = true` is set.
*   **Hardening Recommendation**: In production environments, configurations must enforce `MOCK_REDIS=false`, `ZTAN_MOCK_TPM=false`, and `disableFallback=true` within the bootstrap config, rejecting startup if any mock environment variables are set.

---

## 2. Firecracker Privilege Boundaries
*   **Code Reference**: 
    - [packages/governance-core/src/isolation/physical-firecracker.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/isolation/physical-firecracker.ts#L107-L165) (Jailer configuration)
*   **Evaluation**:
    - When running as root on Linux, the adapter utilizes the Firecracker `jailer`. It drops privileges to `UID 100` and `GID 100` (unprivileged execution) and base chroots to `/srv/jailer/firecracker/<vmId>/root`.
    - It enforces strict process boundaries by pinning resource allocations via cgroups (CPU nodes, memory bounds).
*   **Hardening Recommendation**: Ensure the `/srv/jailer` path is mounted on a read-only or no-exec filesystem overlay on the host node, and forbid jailer execution from directories writeable by the unprivileged user.

---

## 3. Docker Socket Exposure
*   **Code Reference**: 
    - [infra/docker-compose.yml](file:///c:/multiagentic_project/multiAgent-main/infra/docker-compose.yml#L99)
    - [docker-compose.sentinel-chaos.yml](file:///c:/multiagentic_project/multiAgent-main/docker-compose.sentinel-chaos.yml#L121)
*   **Evaluation**:
    - Both compose environments mount the host's `/var/run/docker.sock` inside the test-runner and chaos-injector containers.
    - **Vulnerability**: If an attacker compromises the container containing this mount, they can issue commands directly to the host Docker daemon. Since the Docker daemon runs as root, this allows absolute root privilege escalation on the host system.
*   **Hardening Recommendation**: The Docker socket must never be mounted in production containers. Chaos injection must be handled out-of-band by the host OS monitoring daemon rather than mounting the socket inside a container.

---

## 4. Redis/Postgres Trust Boundaries
*   **Code Reference**: 
    - [packages/utils/src/server.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/server.ts#L416-L417) (Redis Connection Tuning)
    - [packages/utils/src/server.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/server.ts#L566-L620) (Redis Quota Engine)
    - [packages/utils/src/server.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/server.ts#L622-L680) (Tenant-scoped database queries)
*   **Evaluation**:
    - **Redis Connection**: Configuration parameters disable the offline queue (`REDIS_ENABLE_OFFLINE_QUEUE=false`) and set a `REDIS_COMMAND_TIMEOUT=2000`. This ensures that when Sentinel quorum is lost, lock acquisitions and quota validations fail immediately (fail-closed) rather than hanging.
    - **Quota Engine**: If Redis is offline, the quota reservation defaults to a fail-closed posture (`QUOTA_UNAVAILABLE`), blocking mission creation.
    - **Tenant Database Isolation**: All database queries for missions are strictly scoped using `tenantId` to prevent cross-tenant information exposure.
*   **Hardening Recommendation**: Enable row-level security (RLS) on all Postgres tables using Prisma schema configurations to cryptographically enforce tenant isolation at the database layer.

---

## 5. TPM Trust Assumptions
*   **Code Reference**: 
    - [packages/utils/src/tpm-attestation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/tpm-attestation.ts#L28-L181)
    - [packages/runtime-core/src/tpm/quote-generator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/tpm/quote-generator.ts#L3-L95)
*   **Evaluation**:
    - Measured boot PCRs (0 = Firmware, 4 = OS Kernel, 8 = Isolation State) are compared against `GOLDEN_PCRS` values to verify boot state integrity.
    - However, the `TPMQuoteGenerator` generates RSA/EC keys on-the-fly inside memory. This simulated quote verifies the software algorithm but does not prove hardware-rooted attestation.
*   **Hardening Recommendation**: Migrate active production attestation logic to read PCRs directly from `/sys/class/tpm/tpm0/pcr-sha256/` and sign via TPM-resident Endorsement Keys (EK).

---

## 6. Sigstore/Rekor Fallback Behavior
*   **Code Reference**: 
    - [scripts/verify-rekor-interop.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/verify-rekor-interop.ts#L51-L111)
    - [verify-kit/auditor.py](file:///c:/multiagentic_project/multiAgent-main/verify-kit/auditor.py#L106-L113)
*   **Evaluation**:
    - **Submission Fallback**: When submitting entries to the live Rekor endpoint, a 5-second connection timeout is configured. If the connection fails, the process exits with `1` (fail-closed from a provenance recording perspective).
    - **Auditor Fallback**: During verification, if notarization metadata is missing or mismatched, `auditor.py` throws a validation failure. However, if the inclusion proof is absent but Ed25519 signatures are valid, the auditor logs a warning but succeeds.
*   **Hardening Recommendation**: Enforce strict inclusion proof verification in `auditor.py`. The presence of a valid Merkle inclusion proof should be a hard requirement for all v1.9+ evidence validation.

---

## 7. Supply-Chain Integrity
*   **Code Reference**: 
    - [package.json](file:///c:/multiagentic_project/multiAgent-main/package.json#L77-L121) (`pnpm.overrides`)
    - [DEPENDENCY_AUDIT.md](file:///c:/multiagentic_project/multiAgent-main/DEPENDENCY_AUDIT.md)
*   **Evaluation**:
    - Strict overrides are configured for critical packages (e.g. `eslint` pinned to `^8.57.0` for flat config compatibility, `axios`, `zod`, `uuid`, `vite`, `next` etc. locked to versions addressing known CVEs).
    - An automated dependency audit (`DEPENDENCY_AUDIT.md`) is maintained, and unused dead dependencies identified by `knip` have been pruned.
*   **Hardening Recommendation**: Implement daily automated vulnerability scans (e.g., `pnpm audit` or Snyk scans) inside the CI pipeline to flag newly discovered vulnerabilities.

---

## 8. Secret Handling
*   **Code Reference**: 
    - [packages/utils/src/internal-auth.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/internal-auth.ts#L8-L23)
    - [packages/utils/src/middleware/security.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/middleware/security.ts#L100-L104)
*   **Evaluation**:
    - Service-to-service calls use `x-internal-api-key` and `x-internal-token` headers checked against environment variables (`INTERNAL_API_KEY` and `INTERNAL_SERVICE_TOKEN`).
    - Secrets are kept out of logging blocks.
    - Firecracker guests do not inherit host environmental variables, preventing secret leaks to tenant code.
*   **Hardening Recommendation**: Service tokens should be rotated periodically using an external vault (e.g. HashiCorp Vault or AWS Secrets Manager) instead of being loaded as static environment variables at startup.

---

## 9. Container Escape Paths
*   **Code Reference**: 
    - [packages/governance-core/src/isolation/physical-firecracker.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/isolation/physical-firecracker.ts#L86-L90)
*   **Evaluation**:
    - In container fallback mode, the sandbox container is launched with `--cap-drop=ALL` (dropping all Linux capabilities) and `--security-opt=no-new-privileges:true` (preventing child processes from acquiring privileges).
    - It enforces strict memory limits using the `--memory` flag.
*   **Hardening Recommendation**: Enable an explicit AppArmor or Seccomp profile on fallback containers (e.g., `--security-opt=seccomp=ztan-seccomp.json`) to limit exposed kernel syscalls.

---

## 10. Verification-Kit Tamper Resistance
*   **Code Reference**: 
    - [verify-kit/auditor.py](file:///c:/multiagentic_project/multiAgent-main/verify-kit/auditor.py)
*   **Evaluation**:
    - The verification kit is distributed as a python script (`auditor.py`).
    - **Vulnerability**: A malicious operator who has compromised the host node can modify the Python source code of `auditor.py` to bypass signature checks and print false success verdicts.
*   **Hardening Recommendation**: Package the verify-kit as a compiled binary (e.g., using PyInstaller) signed with the ZTAN Release Key. Auditors should run verification in an ephemeral, containerized environment that checks the binary signature before validating evidence.
