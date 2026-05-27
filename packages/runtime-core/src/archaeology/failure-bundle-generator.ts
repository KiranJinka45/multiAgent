import { PrismaClient } from '@prisma/client';
import { captureEnvironmentSnapshot } from './env-snapshot-capture.js';
import { exportRecentSequences } from './wal-sequence-exporter.js';
import { classifyQuarantineCause } from './quarantine-cause-classifier.js';
import { reconstructIncidentTimeline } from './timeline-reconstructor.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * ─── ZTAN Failure Archaeology Forensic Bundle Generator ─────────────────────
 * Automatically executes on quarantine triggers, bundling environment hashes,
 * WAL logs, sequence histories, and diagnostic timelines into a structured file.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface IncidentBundle {
    incidentId: string;
    timestamp: string;
    verdict: any;
    timeline: any[];
    environment: any;
    sequences: any;
}

export class FailureBundleGenerator {
    private prisma: PrismaClient;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.prisma = new PrismaClient();
    }

    /**
     * Automatically capture and export complete forensic bundle on quarantine
     */
    public async generateIncidentBundle(errors: string[]): Promise<string> {
        console.log('⚡ Validation failure triggered! Assembling forensic incident bundle...');
        const incidentId = `INCIDENT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const timestamp = new Date();

        // 1. Capture Environment Snapshot (using standard ZTAN Core vars list)
        const coreZtanVars = new Set([
            'NODE_ENV',
            'DATABASE_URL',
            'PORT',
            'REDIS_URL',
            'ETCD_ENDPOINTS',
            'JWT_SECRET',
            'LOG_LEVEL'
        ]);
        const envSnapshot = captureEnvironmentSnapshot(coreZtanVars);

        // 2. Export Recent WAL & Ledger Sequences
        const sequenceSnapshot = await exportRecentSequences(this.prisma, 10);

        // 3. Classify Quarantine Cause
        const verdict = classifyQuarantineCause(errors);

        // 4. Reconstruct Incident Timeline
        const timeline = reconstructIncidentTimeline(errors, timestamp);

        const bundle: IncidentBundle = {
            incidentId,
            timestamp: timestamp.toISOString(),
            verdict,
            timeline,
            environment: envSnapshot,
            sequences: sequenceSnapshot
        };

        // Write bundle to .ztan/archaeology/incident-[id].json
        const archDir = path.resolve(this.workspaceRoot, '.ztan/archaeology');
        if (!fs.existsSync(archDir)) {
            fs.mkdirSync(archDir, { recursive: true });
        }

        const bundlePath = path.join(archDir, `incident-${incidentId.toLowerCase()}.json`);
        fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2), 'utf8');
        
        console.log(`✅ Forensic bundle successfully exported: ${bundlePath}`);
        await this.prisma.$disconnect();
        return bundlePath;
    }
}
