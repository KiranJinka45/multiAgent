# ZTAN Qualification & Environment Register

In accordance with our claims matrix, ZTAN distinguishes between software-verified capabilities and hardware/environment-dependent features. This register tracks the status of all open qualifications.

## Register of Qualifications

### 1. Physical TPM 2.0 Hardware Integration
- **Current Status:** `[OPEN QUALIFICATION / SIMULATION VERIFIED]`
- **Description:** Direct host-level integration accessing `/dev/tpm0` to retrieve attestations and seal keys.
- **Environment Assumption:** Requires a physical TPM 2.0 chip on a non-virtualized bare-metal node.
- **Verification Path:** Currently verified via simulated/mocked TPM modules. Retiring this qualification requires native deployment on qualifying bare-metal hardware.

### 2. Bare-Metal Firecracker microVM Containment
- **Current Status:** `[OPEN QUALIFICATION / SIMULATION VERIFIED]`
- **Description:** Complete hypervisor-isolated sandbox containment for container execution.
- **Environment Assumption:** Requires KVM virtualization support (`/dev/kvm`) enabled on physical host hardware.
- **Verification Path:** Currently verified under WSL2 and simulated environments. Retiring this qualification requires native bare-metal execution and a 100-launch endurance run.

### 3. Independent Third-Party Operator Audit
- **Current Status:** `[OPEN QUALIFICATION / SIMULATION VERIFIED]`
- **Description:** Separate operator deployment and recovery audit to certify that system documentation is self-sufficient and free from developer bias.
- **Environment Assumption:** Requires a fresh deployment environment managed by an independent third-party auditor.
- **Verification Path:** Retiring this qualification requires the completion of the formal multi-operator ceremony and independent auditor validation.

### 4. External Pilot Deployment
- **Current Status:** `[NOT YET STARTED]`
- **Description:** Deploying the control plane to the first live enterprise tenant under real-world traffic and monitoring.
- **Environment Assumption:** Requires a low-risk tenant, real telemetry, real incident-handling, and a 30-day observation window.
- **Verification Path:** Retiring this qualification requires deploying the control plane for a customer trial, executing recovery drills on active systems, and collecting 30 days of telemetry evidence.
