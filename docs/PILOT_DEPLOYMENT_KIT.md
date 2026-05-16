# ZTAN Pilot Deployment Kit (PDK) v1.0

The ZTAN Pilot Deployment Kit (PDK) contains all the resources necessary to deploy a cryptographically final, institutionally governed ZTAN cell within an enterprise environment.

## 1. Components Included

- **Institutional Witness**: High-availability Merkle anchor node.
- **Unified Auditor**: Compliance and verification control plane.
- **Sovereign Execution Cell**: Isolated, deterministic execution environment.
- **ztanctl**: The unified institutional command surface.

## 2. Deployment Architecture

A standard pilot deployment follows the **Hub-and-Spoke** model:
- **Central Hub**: Unified Auditor + Governance Merkle Tree.
- **Spokes**: Federated execution cells (distributed across regions).

## 3. Quick Start Deployment

1.  **Initialize Configuration**:
    ```bash
    ztanctl pdk init --pilot-name "Pilot-Alpha" --cell-count 3
    ```
2.  **Deploy via Docker Compose**:
    ```bash
    docker-compose -f ./pdk/manifests/docker-compose.yml up -d
    ```
3.  **Verify Institutional Finality**:
    ```bash
    ztanctl health --role sre
    ```

## 4. Enterprise Integration

### A. Key Management (HSM)
The PDK supports **AWS CloudHSM** and **Azure Key Vault** for backing institutional witness keys.
- Configuration: `./pdk/templates/witness.template.json`

### B. SIEM Export (Splunk/ELK)
Evidence packets are exported in JSON format for ingestion into enterprise security monitoring tools.
- Export Path: `/var/log/ztan/evidence/*.json`

### C. SSO/IAM
Role-based access in `ztanctl` can be mapped to enterprise LDAP/Active Directory groups.

---
*For advanced deployment scenarios, refer to `docs/ICP_OPERATOR_GUIDE.md`.*
