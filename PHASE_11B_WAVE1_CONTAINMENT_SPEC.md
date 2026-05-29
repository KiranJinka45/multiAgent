# 🛠️ ZTAN Phase 11B — Wave 1: Tier H0 Isolation & Containment Specification
**The Concrete Execution Guide for Hypervisor Sandboxing & MicroVM Containment**

> [!IMPORTANT]
> **Wave 1 Engineering Boundary: Reduction, Not Absolutism**
> In alignment with Phase 11B's constraints, **Wave 1 is about measurable reduction of trust assumptions, not claims of absolute containment.** 
> We explicitly isolate Tier H0 containment from the rest of the attestation stack. We enforce a strict, debuggable execution sequence:
> `Containment First (Wave 1) ──► Measurement Second ──► Witnessing Third ──► Provenance Fourth ──► External Anchoring Fifth`
> By executing Wave 1 in absolute isolation, we prevent the creation of an un-debuggable, tightly coupled attestation stack early in the lifecycle.

---

## 🏛️ 1. Execution Sandbox: Firecracker & gVisor Runtime Contract

Wave 1 eliminates V8/Node-level privilege assumptions by executing all untrusted, probabilistic multi-agent advisory code (Tier A) inside hypervisor or kernel-intercepted boundaries.

### 1.1 Firecracker microVM Configuration Spec
For high-isolation tenants, primary spawning must go through `firecracker` VM execution utilizing statically compiled kernels and read-only root filesystems:
*   **Guest Kernel Requirements:** Minimal microVM guest kernel (version `v5.10+` or `v6.1+`) stripped of all dynamic module loading (`CONFIG_MODULES=n`), USB, PCI, and unused driver subsystems.
*   **Virtual Interface configuration:** High-performance VirtIO-net and VirtIO-block drivers only.
*   **Resource Allocation Limits:**
    *   `vcpu_count`: Capped at `1` (pinned to host core via taskset).
    *   `mem_size_mib`: Capped at `256 MiB` (enforced via cgroups).
*   **Boot Arguments:**
    ```text
    console=ttyS0 reboot=k panic=1 pci=off nomodules quiet read-only root=/dev/vda
    ```

### 1.2 gVisor (runsc) Sandbox Profile
For legacy utility and diagnostic tools that require standard Node modules but must not touch the host substrate:
*   **Runtime Engine:** `runsc` (Google gVisor container runtime) configured in `kvm` platform mode to leverage hardware virtualization features.
*   **System Call Interception:** gVisor's Sentry intercepts all V8 guest syscalls, running entirely in user space.
*   **Storage Isolation:** Guest `/tmp` and active workspaces mounted strictly as RAM-backed `tmpfs` overlays (maximum size `32 MiB`) with `noexec, nosuid, nodev` flags enabled.

---

## 🏛️ 2. Custom Seccomp-BPF System-Call Filters

Any container or process running Node.js V8 must be restricted via strict, compiled System-Call BPF filters. This minimizes the kernel exploit surface area if a guest process escapes V8 memory.

### 2.1 System-Call Allowlist Contract
Only the following essential system calls are allowlisted. Any attempt to invoke a syscall outside this list results in immediate process termination (`SECCOMP_RET_KILL_PROCESS`):

| Syscall Group | Allowlisted System Calls | Constraint / Operational Logic |
| :--- | :--- | :--- |
| **Process Control** | `exit`, `exit_group`, `nanosleep`, `sched_yield` | Thread blocking and termination only. `fork`, `vfork`, `execve` are strictly blocked. |
| **Memory Management** | `brk`, `mmap`, `munmap`, `mprotect`, `madvise` | Required for V8 garbage collection and heap sweeps. `mmap` write-execution is blocked. |
| **I/O & IPC** | `read`, `write`, `close`, `epoll_wait`, `epoll_ctl` | Restricted strictly to loopback descriptors and supervisor IPC pipes. |
| **System Info** | `clock_gettime`, `gettimeofday` | Monotonic clock reads only. System clock modifications are blocked. |

### 2.2 Compilation CI Gate
*   Custom `.seccomp.json` filter profiles are compiled into BPF bytecode at release build time.
*   CI verification scripts assert that the seccomp profile is loaded during process startup and verify that any execution of forbidden syscalls (e.g. attempting to run `execve` inside a test container) triggers a hard fail-closed kill signal (`SIGSYS`).

---

## 🏛️ 3. Read-Only Rootfs & User Namespace Isolation

We enforce complete post-compromise persistence reduction by rendering the entire runtime execution workspace structurally read-only.

### 3.1 Squashfs Base Image Config
*   The entire Node/V8 runtime environment, standard modules, and compiled Javascript scripts are packaged into a read-only SquashFS (`.squashfs`) file-system image.
*   Base docker/OCI containers are mounted with the `--read-only` flag enabled.
*   Temporary, transient outbox cache blocks are mounted as read-write overlays strictly locked to RAM (`tmpfs`), preventing any file writes from reaching the physical host disk partition.

### 3.2 User Namespace Mapping Rules
*   All containerized and microVM runtimes must utilize User Namespace (`userns`) remapping.
*   Inside the execution boundary, the process operates as `root` (UID `0`, GID `0`) for module execution convenience.
*   On the host operating system, this process is mapped to an unprivileged, unrouted UID/GID range (e.g., UID `100000-165535`):
    ```text
    Host UID 100000  <───>  Guest UID 0 (root)
    Host GID 100000  <───>  Guest GID 0 (root)
    ```
*   This mapping ensures that even if an attacker successfully escapes the hypervisor isolation boundary, they possess zero host-level access.

---

## 🏛️ 4. Supervisor Decomposition & Attestation Envelopes

To preserve the Single-Writer coordination invariants, we formally split the ZTAN supervisor process into two disconnected components operating across distinct security domains.

```
  [ Tier A Advisory Agents ]  ──►  [ Ephemeral Node-V8 Sandbox ] (Tier H0 Isolation Domain)
                                               │
                                               ▼  (Read-Only IPC Pipe: Monotonic Envelope Only)
                                               │
  [ Tier C Database Coordinator ] ◄──  [ Host Supervisor Daemon ] (Authoritative Substrate)
```

### 4.1 The Split Architecture Contract
1.  **Advisory Enclave (Ephemeral Sandbox):** Executes probabilistic workflows, LLM agents, and advisory telemetry parsers. It operates within Tier H0 isolated boundaries and possesses zero direct database or filesystem access.
2.  **Authoritative Host Supervisor:** Runs as a minimal daemon on the host substrate. It validates state transaction signatures, manages single-writer database leases, and handles system quarantine transitions.
3.  **Communication Interface:** The Enclave communicates with the Host Supervisor strictly via a read-only Unix IPC socket pipe (`/var/run/ztan-ipc.sock`).
4.  **Envelope Enforcement:** The Host Supervisor rejects any message from the Enclave unless it conforms to the strict, schema-validated **Autonomous Action Envelope** (monotonically structured, carrying valid digital signatures). No raw commands or administrative scripts may cross this boundary.

---

## 🚫 5. Explicit Non-Goals & Blockers for Wave 1
To prevent uncontrolled scope explosion and ensure Wave 1 remains highly debuggable, the following implementations are strictly barred:
*   ❌ **No TPM Key Sealing or PCR Measurement (Tier H1):** Do not attempt to interface with the hardware TPM or compile secure boot verification yet.
*   ❌ **No Off-Host Witness Node Provisioning (Tier H2):** The detached witness code may run locally as a separate loopback process; do not attempt multi-cloud/off-kernel networking.
*   ❌ **No Rekor or TSA Time Anchoring (Tier H4):** Rely strictly on local host timers and standard transaction locks during Wave 1 integration.

---

## 📊 6. Objective Wave 1 Verification Metrics

Before progressing to Tier H1 attestation, Wave 1 must achieve:
*   **Syscall Containment:** `100%` of forbidden syscalls blocked and verified via automated exit checks.
*   **Startup Latency Bounds:** Ephemeral microVM startup lag must remain secondary to full seccomp validation; maximum cold-start lag must remain under `1.5s` under combinatorial staging.
*   **Zero-Persistence Isolation:** Verification scripts must confirm that arbitrary host file creation is blocked and RAM overlays are cleanly shredded upon process exit.
