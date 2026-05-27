import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * ─── ZTAN Suspend & Discontinuity Detector ───────────────────────────────────
 * Runs a low-overhead heartbeat loop to identify VM pauses, laptop sleep
 * events, container suspension, and thread starvation discontinuities.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface DiscontinuityIncident {
    incidentId: string;
    detectedAtIso: string;
    expectedIntervalMs: number;
    actualIntervalMs: number;
    divergenceMs: number;
    type: 'VM_SUSPEND_RESUME' | 'THREAD_STARVATION';
}

export class RuntimeDiscontinuityDetector {
    private intervalMs: number;
    private thresholdMs: number;
    private timer: NodeJS.Timeout | null = null;
    private lastTickTime: number = 0;
    private incidents: DiscontinuityIncident[] = [];
    private logDir: string;
    private logFile: string;
    private onDiscontinuityCallbacks: ((incident: DiscontinuityIncident) => void)[] = [];

    constructor(workspaceRoot: string, intervalMs: number = 1000, thresholdMs: number = 3000) {
        this.intervalMs = intervalMs;
        this.thresholdMs = thresholdMs;
        this.logDir = path.resolve(workspaceRoot, '.ztan', 'evidence-vault', 'chronology-lineage');
        this.logFile = path.join(this.logDir, `discontinuity-${crypto.randomUUID().slice(0, 8)}.json`);
    }

    /**
     * Registers a callback to trigger immediately upon discontinuity detection.
     */
    onDiscontinuity(callback: (incident: DiscontinuityIncident) => void) {
        this.onDiscontinuityCallbacks.push(callback);
    }

    /**
     * Starts the heartbeat loop.
     */
    start() {
        this.lastTickTime = Date.now();
        this.timer = setInterval(() => {
            const now = Date.now();
            const elapsed = now - this.lastTickTime;
            this.lastTickTime = now;

            if (elapsed > this.intervalMs + this.thresholdMs) {
                // Large intervals indicate sleep/suspend, shorter indicates scheduler lag
                const type = elapsed > 10000 ? 'VM_SUSPEND_RESUME' : 'THREAD_STARVATION';
                const incident: DiscontinuityIncident = {
                    incidentId: `DISC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                    detectedAtIso: new Date(now).toISOString(),
                    expectedIntervalMs: this.intervalMs,
                    actualIntervalMs: elapsed,
                    divergenceMs: elapsed - this.intervalMs,
                    type
                };

                this.incidents.push(incident);
                for (const cb of this.onDiscontinuityCallbacks) {
                    try {
                        cb(incident);
                    } catch (err) {
                        console.error('[Discontinuity Detector] Callback execution error:', err);
                    }
                }
            }
        }, this.intervalMs);

        // Prevent heartbeat timer from blocking Node event loop shutdown
        if (this.timer && typeof this.timer.unref === 'function') {
            this.timer.unref();
        }
    }

    /**
     * Stops the heartbeat loop.
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    getIncidents(): DiscontinuityIncident[] {
        return this.incidents;
    }

    /**
     * Flushes the mapped discontinuity incidents to the Evidence Vault.
     */
    flushToVault(): string {
        if (this.incidents.length === 0) return '';
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        fs.writeFileSync(this.logFile, JSON.stringify(this.incidents, null, 2), 'utf8');
        return this.logFile;
    }
}
