# ZTAN Ecosystem Integration Guide

This guide provides technical instructions for integrating Nexus ZTAN with common enterprise infrastructure and security platforms.

## 1. Security Information & Event Management (SIEM)

### Splunk / Datadog
ZTAN ships security events in **Common Event Format (CEF)** and **OpenTelemetry (OTLP)**.
- **Auto-Sync**: Run `ztanctl interop siem-sync` to force a push of forensic security events.
- **Log Source**: Configure your SIEM to listen for `ZTAN_PLATFORM` source events.
- **Key Events**:
    - `ACCESS_DENIED`: Unauthorized attempts to access governance primitives.
    - `GOVERNANCE_BREACH`: Detected forks in the Merkle lineage.
    - `IDENTITY_ROTATION`: Successful or failed SPIFFE SVID rotations.

## 2. Infrastructure as Code (IaC)

### Terraform
Deploy institutional cells using the ZTAN Terraform provider (mock/alpha).
- **Profile Location**: `deploy/terraform/main.tf`
- **Command**: `ztanctl interop terraform-plan`
- **Capabilities**: Provision witness nodes, identity planes, and Merkle anchors.

### Ansible
Automate node provisioning and hardening.
- **Playbook**: `deploy/ansible/provision.yml`
- **Features**: Automatic kernel freezing, TPM initialization, and ZTAN runtime onboarding.

## 3. Cloud Integration

### AWS GovCloud / GCP Assured Workloads
- **Attestation**: Use `ztanctl hardware attest` to verify Nitro Enclave / Shielded VM signatures.
- **Data Residency**: Configure `JurisdictionalDataManager` via `compliance-as-code`.

## 4. Identity & Mesh
- **SPIFFE/SPIRE**: ZTAN supports native SPIFFE attestation for service-to-service identity.
- **W3C VCs**: Issue Verifiable Credentials for human operators via `ztanctl interop issue-vc`.

---
**Institutional Ecosystem Board** 🌐
