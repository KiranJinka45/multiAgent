# ZTAN Institutional Onboarding Playbook

This playbook defines the formal process for onboarding an external institutional pilot to the Nexus ZTAN platform.

## Phase 1: Registration & Profiling

1.  **Select Institutional Profile**: Determine if the institution fits a predefined profile:
    - `university`: For research and academic environments.
    - `regulated-sandbox`: For fintech and compliance testing.
    - `sovereign`: For government-grade isolation.
2.  **Register Pilot**: Use `ztanctl` to register the institution in the registry.
    ```bash
    ztanctl pilot register --name "Global Research Univ" --type UNIVERSITY --role sre
    ```
3.  **Note Pilot ID**: The registry will return a unique `PILOT-XXXX` ID.

## Phase 2: Cell Provisioning

1.  **Generate PDK**: Create a Pilot Deployment Kit for the institution.
    ```bash
    ztanctl pdk --pilot-name "Global-Research-Univ" --cell-count 3 --role sre
    ```
2.  **Deploy Cells**: Deploy the execution cells and associate them with the Pilot ID.
    ```bash
    ztanctl deploy init university --role sre
    ```

## Phase 3: Verification & Handover

1.  **Health Check**: Verify the pilot cells are operational.
    ```bash
    ztanctl pilot list --role sre
    ```
2.  **Compliance Signoff**: Run a stability audit before handing over keys.
    ```bash
    ztanctl freeze audit --role compliance
    ```
3.  **Handover**: Provide the PDK and access credentials to the institutional operator.

---
**Certified by ZTAN Stewardship Board** 🛡️
