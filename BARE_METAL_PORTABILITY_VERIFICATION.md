# ZTAN — Bare-Metal Portability Verification Runbook (v1.5)

This runbook outlines the step-by-step procedures required to validate the ZTAN external reproducibility verification kit (`verify-kit`) on physical bare-metal hardware. Physical validation ensures that third-party operators, auditors, and SREs can independently run the ZTAN cryptographic verification tools under real hardware environments without architectural dependencies on virtualized runtimes.

---

## 1. Hardware & OS Baseline

To satisfy the non-virtualized hardware portability requirements of `OPS-MAINT-PORT-01`, you should execute this runbook on a physical bare-metal host.

### Virtualization & Hardware Check
Verify that the host CPU supports hardware virtualization and that the KVM kernel module is loaded:

```bash
# Check CPU hardware virtualization (VT-x for Intel, AMD-V for AMD)
lscpu | grep Virtualization

# Check if /dev/kvm is writable and accessible
ls -l /dev/kvm
```

> [!NOTE]
> While KVM virtualization check is a critical part of the full ZTAN Firecracker container/sandbox isolation environment, the `verify-kit` itself runs in user space using Python 3 and can execute on any standard non-virtualized OS shell once Python packages are installed.

---

## 2. Python Environment Prerequisites

The ZTAN External Verification Kit requires a clean Python 3 installation with cryptographic package dependencies.

### Version Baseline
- **Python Version**: Minimum `3.9` up to `3.14` (LTS baseline).
- **Pip Packages**: `py_ecc` (for BLS12-381 curve arithmetic) and `cryptography` (for Ed25519 signature checks).

### Installing Dependencies
Run the following commands on your bare-metal host to set up a virtual environment and install the required modules:

```bash
# 1. Create a clean Python virtual environment
python -m venv .venv

# 2. Activate the virtual environment
# On Linux/macOS:
source .venv/bin/activate
# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1

# 3. Upgrade pip and install the verify-kit dependencies
pip install --upgrade pip
pip install py_ecc cryptography
```

---

## 3. Portability Validation Execution

To verify the kit's correctness and portability end-to-end, execute the following three stages:

### Stage 1: Generate Fresh Ground-Truth Vectors
Run the Node.js DKG vector generator to dynamically produce fresh, cryptographically bound test vectors and a proof bundle using the active ZTAN cryptographic engine:

```bash
# Generate vectors.json and bundle.json
node verify-kit/v1.5/generate-vectors.mjs
```

### Stage 2: Execute Vector Validation
Run the Python verification tool against the generated `vectors.json` to verify that the canonical layout and binding hashes match:

```bash
python verify-kit/v1.5/verify.py --test verify-kit/v1.5/vectors.json
```

### Stage 3: Execute Proof Bundle Verification
Run the Python verification tool against the generated `bundle.json` to verify the aggregate BLS12-381 threshold signatures:

```bash
python verify-kit/v1.5/verify.py --bundle verify-kit/v1.5/bundle.json
```

---

## 4. SRE Verification Checklist

An operator or SRE must check and tick the following checklist items to formally certify the portability validation:

| ID | Verification Property | Expected Output | Status |
| :--- | :--- | :--- | :---: |
| **PORT-CHK-01** | Python Environment Setup | Python 3.9+ found; `py_ecc` and `cryptography` loaded successfully. | [ ] |
| **PORT-CHK-02** | Vector Generation Parity | `generate-vectors.mjs` executes and writes `vectors.json` / `bundle.json` cleanly. | [ ] |
| **PORT-CHK-03** | Test Vector Execution | `verify.py --test` outputs `--- TEST SUMMARY: 1/1 PASSED ---` | [ ] |
| **PORT-CHK-04** | Proof Bundle Execution | `verify.py --bundle` outputs `[SUCCESS] Proof is valid and non-repudiable.` | [ ] |
| **PORT-CHK-05** | Portable Auditor Parity | `auditor.py` executes successfully on the generated `bundle.json` with code `0`. | [ ] |

---

**Nexus ZTAN: Auditable, evidence-bound cryptographic trust.**
