# 🏁 Nexus ZTAN — Operator Training & Setup

**Introduction**. 

You are being trained to maintain the Nexus ZTAN platform. 
**Crucial Instruction**: Follow this documentation strictly. Do not deviate from the listed steps.

### 1. Operational Training Goal
Your goal is to bring the Nexus ZTAN platform to a "Healthy" state and verify recovery procedures.

### 2. Available Resources
- [OPERATOR_PLAYBOOK.md](file:///c:/multiagentic_project/multiAgent-main/OPERATOR_PLAYBOOK.md) — Your primary guide.
- [RUNBOOK.md](file:///c:/multiagentic_project/multiAgent-main/RUNBOOK.md) — Your emergency procedures.
- [README.md](file:///c:/multiagentic_project/multiAgent-main/README.md) — The system overview.

### 3. Training Protocol
- **Documentation Only**: Do not seek assistance from the development team. This ensures the documentation is self-sufficient.
- **Record Friction**: Document every hesitation or error using the CLI: `ztanctl friction "<your feedback>"`.
- **Passive Monitoring**: An automated "Operator Friction Monitor" is tracking system state changes to identify documentation gaps.

### 4. Setup Procedure

Execute the following commands to initialize your environment:

```bash
# 1. Clone and enter repository (if not already done)
# 2. Install dependencies
pnpm install

# 3. Initialize local cluster
pnpm run orchestrate

# 4. Verify baseline health
pnpm exec ztanctl health
```

### 5. Begin Training

Once your environment is healthy, open the [OPERATOR_PLAYBOOK.md](file:///c:/multiagentic_project/multiAgent-main/OPERATOR_PLAYBOOK.md) and begin **Phase 0: Initial Triage**.

If you encounter ANY confusion, log it immediately:
`ztanctl friction "The setup command failed with error X"`

---
**Status**: Ready for Operational Training.
