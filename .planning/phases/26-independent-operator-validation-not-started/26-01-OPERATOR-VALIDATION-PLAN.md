---
wave: 1
depends_on: []
files_modified:
  - operator-independent-attestation.json
autonomous: false
requirements:
  - EVIDENCE-OPERATOR-01
---

# Plan 26-01: Independent Operator Validation Campaign

Demonstrate that an independent human operator can successfully deploy, operate, and verify the ZTAN control plane on a fresh machine without author assistance.

## Tasks

<task>
<action>
Select operator and provision the fresh VM environment:
- Enlist a third-party SRE or operator who is not a repository contributor.
- Provision a clean workstation or cloud VM instance with standard Linux (Ubuntu 22.04+ / Debian 12+) and Node/Pnpm installed.
- Ensure the operator has only read-only clone access to the repository.
</action>
<acceptance_criteria>
- Clean VM environment details (CPU, OS, Node, Pnpm version) documented.
- Public read-only repository clone URL verified.
</acceptance_criteria>
</task>

<task>
<action>
Execute deployment and build setup:
- Operator clones the repository:
  `git clone <repo-url> && cd multiAgent-main`
- Operator installs dependencies:
  `pnpm install`
- Operator builds the workspace:
  `pnpm run build`
- Verify no author assistance is provided during this process.
</action>
<acceptance_criteria>
- Project successfully clones on the fresh machine.
- Monorepo package installation and typescript builds complete without compilation errors.
</acceptance_criteria>
</task>

<task>
<action>
Execute smoke testing and cryptographic verification:
- Operator runs the monorepo smoke tests:
  `node scripts/run-smoke-tests.js`
- Operator runs the verify-kit vector generator and validation pipeline:
  `node verify-kit/v1.5/generate-vectors.mjs`
  `python verify-kit/v1.5/verify.py --test verify-kit/v1.5/vectors.json`
  `python verify-kit/v1.5/verify.py --bundle verify-kit/v1.5/bundle.json`
  `python verify-kit/auditor.py verify-kit/v1.5/bundle.json`
</action>
<acceptance_criteria>
- Smoke tests pass with code 0.
- All verification vector runs and python auditor checks execute and return clean validation outputs.
</acceptance_criteria>
</task>

<task>
<action>
Assemble and record operator attestation:
- Operator signs an attestation confirming:
  - No developer/author assistance was received.
  - Setup was done on a fresh, clean VM.
  - All verification kit stages successfully executed.
- Output the signed log to the workspace root:
  `operator-independent-attestation.json`
</action>
<acceptance_criteria>
- Evidence file `operator-independent-attestation.json` exists in the repository, containing the operator's environment fingerprint, step-by-step pass log, and signature.
</acceptance_criteria>
</task>

## Verification
- Verify that the generated operator attestation matches requirements and passes smoke checks:
  `node scripts/run-smoke-tests.js`
