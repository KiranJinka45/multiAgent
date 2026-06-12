# ZTAN Security Threat Model

This document outlines the security architecture, trust boundaries, threat classification (STRIDE), and specific security assumptions for the Zero Trust Access Network (ZTAN) platform.

---

## 1. System Boundaries & Architecture

Nexus ZTAN is designed to coordinate trust-bound tasks across isolated execution environments while providing cryptographically verifiable evidence. The architecture consists of:
1. **Control Plane**: Express-based services managing coordination, queues (BullMQ), and storage (Postgres, Redis Sentinel).
2. **Execution Boundary**: Hardened sandboxes (native Firecracker microVMs launched via `jailer`, or Docker container fallbacks).
3. **Forensic Trust Chain**: Measured boot attestation (TPM), public transparency ledger (Sigstore/Rekor), and offline verify-kit.

```mermaid
graph TD
    subgraph Host OS (Root)
        Jailer["Jailer (UID 100/GID 100)"]
        FC["Firecracker MicroVM"]
        DockerSock["Docker Daemon (/var/run/docker.sock)"]
    end
    
    subgraph Control Plane
        API["Core API / Gateway"]
        Redis["Redis Sentinel Cluster"]
        DB["Postgres Database"]
    end
    
    subgraph External
        Rekor["Sigstore / Rekor API"]
        Auditor["Offline Auditor (auditor.py)"]
    end
    
    API -->|Spawns| Jailer
    Jailer -->|Executes| FC
    FC -->|Vsock| API
    API -->|Schedules/Locks| Redis
    API -->|Persists State| DB
    API -->|Submits Evidence| Rekor
    Auditor -->|Verifies Bundle| Rekor
```

---

## 2. Asset Catalog

The following table catalogs the core ZTAN assets and their confidentiality, integrity, and availability (CIA) requirements:

| Asset ID | Asset Name | Description | Confidentiality | Integrity | Availability |
|---|---|---|---|---|---|
| **AST-01** | Private Attestation Keys | Keys used by the TPM (AK) or HSM (SK) to sign quotes. | **HIGH** | **HIGH** | **HIGH** |
| **AST-02** | Evidence Logs | JSON records containing cryptographic proof chains. | **LOW** | **HIGH** | **MEDIUM** |
| **AST-03** | Tenant Quota State | Redis counters tracking per-tenant usage limits. | **LOW** | **HIGH** | **HIGH** |
| **AST-04** | VFS Lock Directory | Coordination locks ensuring single-writer execution. | **LOW** | **HIGH** | **HIGH** |
| **AST-05** | Service Secrets | Secrets used for service-to-service auth (`INTERNAL_API_KEY`). | **HIGH** | **HIGH** | **HIGH** |

---

## 3. Trust Boundaries

Trust boundaries delineate zones where security permissions change:
1. **Auditor vs. Operator Boundary**: The verify-kit (`auditor.py`) runs in a completely separate operator environment with zero write access to the main repository.
2. **Control Plane vs. Sandbox Boundary**: The core API service runs as a high-privilege process (with access to KVM/Docker), while the tenant sandbox runs under strict capabilities containment.
3. **Database/Redis vs. Application Boundary**: Redis Sentinel failover coordinates consensus; network partitions must trigger fail-closed fencing to prevent split-brain execution.
4. **Host vs. WSL2 Environment**: WSL2 provides a nested virtualization boundary, simulating TPM hardware and restricting direct hardware access compared to bare-metal systems.

---

## 4. STRIDE Threat Mapping

### 4.1. Spoofing
*   **Threat**: Fake TPM Quote Generation.
    *   **Vulnerability**: If `ZTAN_MOCK_TPM` is set to `true`, the quote generator relies on an ephemeral, simulated software key pair rather than physical TPM fuses.
    *   **Impact**: Compromised host nodes can pretend to be healthy, passing measured boot checks.
*   **Threat**: Spoofed Service-to-Service Request.
    *   **Vulnerability**: Service-to-service calls use `x-internal-api-key` matched against `process.env.INTERNAL_API_KEY`. If this key is weak or leaked, an attacker can invoke internal endpoints directly.

### 4.2. Tampering
*   **Threat**: Offline Evidence Modification.
    *   **Vulnerability**: An operator modifies the JSON proof bundle before submitting it to the auditor.
    *   **Mitigation**: Ed25519 signatures over the payload (containment, recovery, sandbox) and Rekor Signed Entry Timestamps (SET) ensure tampered payloads fail cryptographic verification.
*   **Threat**: Auditor Script Alteration.
    *   **Vulnerability**: An attacker modifies the offline verification script `auditor.py` to bypass checks.
    *   **Mitigation**: The verify-kit must be verified against published release checksums before execution.

### 4.3. Repudiation
*   **Threat**: Log Truncation or Deletion.
    *   **Vulnerability**: A rogue operator erases audit logs (`ExecutionLog` or Postgres records) to hide a security breach.
    *   **Mitigation**: Merkle-tree hashing of the transparency log combined with Rekor submissions creates an append-only, non-repudiable audit path.

### 4.4. Information Disclosure
*   **Threat**: Host Environment Secret Leakage.
    *   **Vulnerability**: Host environment variables (e.g. AWS keys, DB passwords) get inherited by sandboxed execution environments.
    *   **Mitigation**: Firecracker microVMs are spawned with clean environment blocks, verified in integration testing (`e8-real-firecracker.test.ts`).

### 4.5. Denial of Service
*   **Threat**: Quorum-Loss Hang.
    *   **Vulnerability**: When Redis Sentinels lose quorum, client connections could block indefinitely, exhausting application threads.
    *   **Mitigation**: Dynamic connection parameter tuning (`REDIS_ENABLE_OFFLINE_QUEUE=false` and `REDIS_COMMAND_TIMEOUT=2000`) forces fail-closed exceptions within 2 seconds.
*   **Threat**: Stream Payload Overload.
    *   **Vulnerability**: Attacking client sends massive request payloads to consume memory and CPU parsing resources.
    *   **Mitigation**: Stream-level validation limits request sizes to 1MB and terminates the socket instantly if exceeded.

### 4.6. Elevation of Privilege
*   **Threat**: Docker Socket Escape.
    *   **Vulnerability**: The Docker socket (`/var/run/docker.sock`) is mounted inside the chaos-injector or test-runner containers.
    *   **Impact**: If these containers are compromised, the attacker gains full root access to the host machine.
*   **Threat**: Container Sandbox Escape.
    *   **Vulnerability**: If Firecracker KVM execution fails and the adapter falls back to Docker, vulnerabilities in the host kernel could be exploited.
    *   **Mitigation**: Fallback containers run with `--cap-drop=ALL` and `no-new-privileges:true` to restrict syscall execution.

---

## 5. Trust Assumptions

1. **Host Integrity**: We assume that if a physical host attestation report states `FULL_PHYSICAL_CERTIFIED`, the bare-metal kernel has not been compromised prior to the measured boot sequence.
2. **Sigstore Availability**: The verification process assumes that the Rekor ledger holds correct checkpoints. If Rekor is offline, the verification kit warns the operator but does not halt verification (fail-open for verification, while submission is fail-closed).
3. **Cryptography Strength**: We assume that NIST P-256 (for TPM simulation) and Ed25519 (for offline signatures) are mathematically secure against active decryption attacks.
