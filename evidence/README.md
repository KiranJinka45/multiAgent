# Evidence Directory

This directory contains longitudinal operational evidence for the ZTAN runtime.

## Structure

```
evidence/
├── replay-matrix/        # Automated replay verification results
│   └── replay-<timestamp>.json
├── weekly/               # Weekly OTM evidence snapshots
│   └── otm-week-<YYYY-WNN>.json
└── external-operators/   # Independent operator validation reports
    └── operator-<id>/
        ├── onboarding.md
        ├── replay-result.json
        └── divergence-report.json
```

## Evidence Artifact Schema

Each replay matrix entry contains:
- `runId`: unique run identifier
- `timestamp`: ISO-8601 execution time
- `environment`: platform, arch, nodeVersion, nodeEnv
- `environmentHash`: SHA-256 of environment fingerprint
- `results[]`: per-trace verification results
- `summary`: pass/fail/corrupted counts and pass rate

## Weekly OTM Snapshot Schema

Each weekly snapshot should contain:
- `week`: ISO week identifier (YYYY-WNN)
- `replayPassRate`: { mean, p50, p95, sampleCount }
- `startupVariance`: { mean, stddev, p95, sampleCount }
- `mttrDistribution`: { mean, p50, p95, sampleCount }
- `replayDrift`: { divergenceCount, categories }
- `traceInflation`: { avgTraceSize, maxTraceSize, traceCount }
- `failureFrequency`: { total, byClass }
- `environmentCoverage`: list of verified environments

## Policy

- Evidence files are append-only. Do not modify or delete historical entries.
- All evidence is machine-generated. Narrative summaries belong in docs/, not here.
- Cross-reference failures with /failures/<incident-id>/ entries.
