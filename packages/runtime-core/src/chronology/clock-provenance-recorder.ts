import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * ─── ZTAN Clock Provenance Telemetry ─────────────────────────────────────────
 * Captures wall-clock time, monotonic processor ticks, process uptime,
 * local timezone offsets, and NTP drift telemetry for chronology auditing.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface ClockProvenanceSnapshot {
    timestampMs: number;
    wallClockIso: string;
    monotonicNs: string;
    uptimeSeconds: number;
    timezone: string;
    ntpOffsetMs: number;
    ntpDriftPpm: number;
    driftStatus: string;
}

export class ClockProvenanceRecorder {
    private workspaceRoot: string;
    private logDir: string;
    private logFile: string;
    private activeSnapshots: ClockProvenanceSnapshot[] = [];

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.logDir = path.resolve(workspaceRoot, '.ztan', 'evidence-vault', 'chronology-lineage');
        this.logFile = path.join(this.logDir, `provenance-${crypto.randomUUID().slice(0, 8)}.json`);
    }

    /**
     * Records a single temporal coordinate, capturing clock divergence markers.
     */
    recordSnapshot(ntpOffsetMs: number = 0, ntpDriftPpm: number = 0): ClockProvenanceSnapshot {
        const wallClock = Date.now();
        const monotonic = process.hrtime.bigint().toString();
        const uptime = process.uptime();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const snapshot: ClockProvenanceSnapshot = {
            timestampMs: wallClock,
            wallClockIso: new Date(wallClock).toISOString(),
            monotonicNs: monotonic,
            uptimeSeconds: uptime,
            timezone,
            ntpOffsetMs,
            ntpDriftPpm,
            driftStatus: Math.abs(ntpOffsetMs) > 100 ? 'DEGRADED' : 'NORMAL'
        };

        this.activeSnapshots.push(snapshot);
        return snapshot;
    }

    getSnapshots(): ClockProvenanceSnapshot[] {
        return this.activeSnapshots;
    }

    /**
     * Flushes the captured chronology timeline directly to the Evidence Vault.
     */
    flushToVault(): string {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        fs.writeFileSync(this.logFile, JSON.stringify(this.activeSnapshots, null, 2), 'utf8');
        return this.logFile;
    }
}
