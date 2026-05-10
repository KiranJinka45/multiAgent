# ZTAN Operator Quickstart

> Time budget: 30 minutes to first successful replay verification.

## Prerequisites

- Node.js 18.x or 20.x LTS
- Docker 24.x + Docker Compose v2
- pnpm 8.x+

## Step 1 — Clone and Install

```bash
git clone <repo-url> && cd multiAgent-main
pnpm install --frozen-lockfile
```

## Step 2 — Configure Environment

```bash
cp .env.production.example .env
# Edit .env: set GEMINI_API_KEY (required)
```

## Step 3 — Boot Runtime

```bash
docker compose -f docker/docker-compose.yml up -d
```

Verify health:

```bash
docker compose -f docker/docker-compose.yml ps
# All services should show "Up" status
```

## Step 4 — Run a Deployment

```bash
npx ts-node packages/runtime-core/src/workloads/deployment-controller.ts
```

Expected output:

```
[TDC] Starting Traceable Deployment
[TDC] Executing action: copy
[TDC] Executing action: restart
[OTM] Operational Truth Metrics Emitted
[TDC] Demo Deployment Complete
```

## Step 5 — Verify Trace Persistence

```bash
ls .ztan/trace/
# Should contain: DEP_<timestamp>.trace.json
```

Inspect a trace:

```bash
cat .ztan/trace/DEP_*.trace.json | head -20
```

## Step 6 — Run Replay Verification

```bash
npx ts-node scripts/replay-verify.ts
```

Expected output:

```
[REPLAY] ZTAN Replay Verification Tool
[REPLAY] Environment: linux-x64-v20.x.x
---
  ✓ DEP_<timestamp>.trace.json: PASS (4 events, 0 divergences)
---
[REPLAY] Results: 1/1 passed (100.0%)
[REPLAY] Evidence persisted: evidence/replay-matrix/replay-<id>.json
```

## Step 7 — Run CI Governance Audit

```bash
npx ts-node scripts/ci-governance.ts
```

Expected: `[CI-GOV] Audit PASSED. Structural integrity verified.`

## Troubleshooting

| Symptom                    | Cause                        | Fix                                    |
| -------------------------- | ---------------------------- | -------------------------------------- |
| `GEMINI_API_KEY` error     | Missing env var              | Set in `.env`                          |
| Trace dir missing          | First run hasn't executed    | Run TDC first (Step 4)                 |
| Replay FAIL                | Environment mismatch         | Check Node version and OS              |
| Trace corruption           | Mid-write crash or tampering | Check `/failures/corrupted/` for logs  |
| CI-GOV fails               | Contract file missing        | Verify `packages/runtime-core/src/contracts.ts` exists |
| Docker services won't start| Port conflict or Docker issue| Run `docker compose down` first        |

## Reporting Results

After completing all steps, please report:

1. **Onboarding time**: How long from clone to successful replay?
2. **Replay result**: PASS/FAIL and any divergences
3. **Environment**: OS, Node version, architecture
4. **Friction points**: Any steps that were unclear or failed

Submit reports to: `/evidence/external-operators/`
